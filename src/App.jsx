import { useEffect, useState } from "react";
import "./App.css";
import API from "./services/api";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });
  const [view, setView] = useState(token ? "dashboard" : "login");
  const [apps, setApps] = useState([]);
  const [consents, setConsents] = useState([]);
  const [linkedAccounts, setLinkedAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const saveSession = (responseData) => {
    localStorage.setItem("token", responseData.token);
    localStorage.setItem("user", JSON.stringify(responseData.user));
    setToken(responseData.token);
    setUser(responseData.user);
    setView("dashboard");
  };

  const clearSession = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken("");
    setUser(null);
    setApps([]);
    setConsents([]);
    setLinkedAccounts([]);
    setView("login");
  };

  const fetchApps = async () => {
    const response = await API.get("/apps");
    setApps(response.data);
  };

  const fetchConsents = async () => {
    const response = await API.get("/consents");
    setConsents(response.data);
  };

  const fetchLinkedAccounts = async () => {
    const response = await API.get("/integrations/linked");
    setLinkedAccounts(response.data);
  };

  const bootstrapDashboard = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchApps(), fetchConsents(), fetchLinkedAccounts()]);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      bootstrapDashboard();
    }
  }, [token]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const integration = params.get("integration");
    const status = params.get("status");
    const detail = params.get("detail");

    if (integration && status) {
      const normalized = integration.charAt(0).toUpperCase() + integration.slice(1);
      setMessage(
        detail
          ? `${normalized} integration status: ${status} (${detail})`
          : `${normalized} integration status: ${status}`
      );
      window.history.replaceState({}, "", window.location.pathname);

      if (token && status === "connected") {
        fetchLinkedAccounts();
      }
    }
  }, [token]);

  const handleRegister = async (payload) => {
    try {
      setLoading(true);
      setMessage("");
      const response = await API.post("/auth/register", payload);
      saveSession(response.data);
      setMessage("Registration successful");
    } catch (error) {
      setMessage(error.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (payload) => {
    try {
      setLoading(true);
      setMessage("");
      const response = await API.post("/auth/login", payload);
      saveSession(response.data);
      setMessage("Login successful");
    } catch (error) {
      setMessage(error.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateConsent = async (payload) => {
    try {
      setLoading(true);
      setMessage("");
      await API.post("/consents", payload);
      await fetchConsents();
      setMessage("Consent created");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to create consent");
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = async (consentId, permission) => {
    try {
      const targetConsent = consents.find((consent) => consent._id === consentId);
      if (!targetConsent) return;

      const updatedPermissions = targetConsent.permissions.includes(permission)
        ? targetConsent.permissions.filter((item) => item !== permission)
        : [...targetConsent.permissions, permission];

      await API.put(`/consents/${consentId}`, {
        permissions: updatedPermissions,
        isActive: true
      });

      await fetchConsents();
      setMessage("Consent permissions updated");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to update permission");
    }
  };

  const handleUpdateExpiry = async (consentId, expiresAt) => {
    try {
      await API.put(`/consents/${consentId}`, { expiresAt });
      await fetchConsents();
      setMessage("Consent expiry updated");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to update expiry");
    }
  };

  const handleRevokeConsent = async (consentId) => {
    try {
      await API.delete(`/consents/${consentId}`);
      await fetchConsents();
      setMessage("Consent revoked");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to revoke consent");
    }
  };

  const handleConnectIntegration = async (provider) => {
    try {
      const response = await API.post(`/integrations/${provider}/connect`);
      window.location.href = response.data.authUrl;
    } catch (error) {
      setMessage(error.response?.data?.message || `Unable to connect ${provider}`);
    }
  };

  const handleDisconnectIntegration = async (provider) => {
    try {
      await API.delete(`/integrations/${provider}`);
      await fetchLinkedAccounts();
      setMessage(`${provider} disconnected`);
    } catch (error) {
      setMessage(error.response?.data?.message || `Unable to disconnect ${provider}`);
    }
  };

  return (
    <main className="app-shell">
      {loading && <p className="alert-bar">Processing request...</p>}
      {message && <p className="alert-bar">{message}</p>}

      {view === "login" && (
        <LoginPage onLogin={handleLogin} switchToRegister={() => setView("register")} />
      )}

      {view === "register" && (
        <RegisterPage onRegister={handleRegister} switchToLogin={() => setView("login")} />
      )}

      {view === "dashboard" && (
        <DashboardPage
          user={user}
          apps={apps}
          consents={consents}
          linkedAccounts={linkedAccounts}
          onSyncConsent={handleCreateConsent}
          onTogglePermission={handleTogglePermission}
          onRevokeConsent={handleRevokeConsent}
          onUpdateExpiry={handleUpdateExpiry}
          onConnectIntegration={handleConnectIntegration}
          onDisconnectIntegration={handleDisconnectIntegration}
          onLogout={clearSession}
        />
      )}
    </main>
  );
}

export default App;
