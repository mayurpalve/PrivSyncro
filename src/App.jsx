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

  const [consents, setConsents] = useState([]);
  const [linkedAccounts, setLinkedAccounts] = useState([]);
  const [integrationHealth, setIntegrationHealth] = useState({ providers: [] });
  const [riskMeta, setRiskMeta] = useState({ supportedDataTypes: [] });
  const [governanceSummary, setGovernanceSummary] = useState({
    title: "",
    subtitle: "",
    overall: {
      baselineRisk: 0,
      governedRisk: 0,
      optimizedRisk: 0,
      measurablePrivacyImprovementPct: 0,
      controlCoveragePct: 0
    },
    recommendations: []
  });
  const [liveVerification, setLiveVerification] = useState({});
  const [decisionSummary, setDecisionSummary] = useState({
    appSummaries: [],
    totals: { apps: 0, allowed: 0, limited: 0, blocked: 0 }
  });
  const [activities, setActivities] = useState([]);

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
    setConsents([]);
    setLinkedAccounts([]);
    setIntegrationHealth({ providers: [] });
    setRiskMeta({ supportedDataTypes: [] });
    setGovernanceSummary({
      title: "",
      subtitle: "",
      overall: {
        baselineRisk: 0,
        governedRisk: 0,
        optimizedRisk: 0,
        measurablePrivacyImprovementPct: 0,
        controlCoveragePct: 0
      },
      recommendations: []
    });
    setLiveVerification({});
    setDecisionSummary({
      appSummaries: [],
      totals: { apps: 0, allowed: 0, limited: 0, blocked: 0 }
    });
    setActivities([]);
    setView("login");
  };

  const fetchConsents = async () => {
    const response = await API.get("/consent");
    setConsents(response.data);
  };

  const fetchLinkedAccounts = async () => {
    const response = await API.get("/integrations/linked");
    setLinkedAccounts(response.data);
  };

  const fetchIntegrationHealth = async () => {
    const response = await API.get("/integrations/health");
    setIntegrationHealth(response.data);
  };

  const fetchRiskMeta = async () => {
    const response = await API.get("/risk/meta");
    setRiskMeta(response.data);
  };

  const fetchDecisionSummary = async () => {
    const response = await API.get("/decision/summary");
    setDecisionSummary(response.data);
  };

  const fetchGovernanceSummary = async () => {
    const response = await API.get("/governance/summary");
    setGovernanceSummary(response.data);
  };

  const fetchActivities = async () => {
    const response = await API.get("/activity", { params: { limit: 50 } });
    setActivities(response.data);
  };

  const bootstrapDashboard = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchConsents(),
        fetchLinkedAccounts(),
        fetchIntegrationHealth(),
        fetchRiskMeta(),
        fetchDecisionSummary(),
        fetchGovernanceSummary(),
        fetchActivities()
      ]);
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
      const response = await API.post("/auth/signup", payload);
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

  const handleUpsertConsent = async (payload) => {
    try {
      setLoading(true);
      setMessage("");
      await API.post("/consent", payload);
      await Promise.all([fetchConsents(), fetchDecisionSummary(), fetchGovernanceSummary()]);
      setMessage("Consent policy saved");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to save consent policy");
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeConsent = async (consentId) => {
    try {
      await API.patch(`/consent/${consentId}/revoke`);
      await Promise.all([fetchConsents(), fetchDecisionSummary(), fetchGovernanceSummary()]);
      setMessage("Consent policy revoked");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to revoke consent");
    }
  };

  const handleEvaluateDecision = async ({ appId, dataType, duration = 60 }) => {
    try {
      setLoading(true);
      setMessage("");
      const response = await API.post("/decision", { appId, dataType, duration });
      await Promise.all([fetchDecisionSummary(), fetchGovernanceSummary(), fetchActivities()]);
      setMessage(
        `Decision: ${response.data.decision} | Risk: ${Number(response.data.riskScore).toFixed(2)}`
      );
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to evaluate decision");
    } finally {
      setLoading(false);
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
      setLiveVerification((prev) => {
        const updated = { ...prev };
        delete updated[provider];
        return updated;
      });
      setMessage(`${provider} disconnected`);
    } catch (error) {
      setMessage(error.response?.data?.message || `Unable to disconnect ${provider}`);
    }
  };

  const handleVerifyIntegrationLive = async (provider) => {
    try {
      const response = await API.get(`/integrations/${provider}/verify`);
      setLiveVerification((prev) => ({
        ...prev,
        [provider]: response.data
      }));
      setMessage(`${provider} live verification successful`);
    } catch (error) {
      const payload = error.response?.data;
      setLiveVerification((prev) => ({
        ...prev,
        [provider]: {
          provider,
          verified: false,
          detail: payload?.detail || payload?.message || "Verification failed"
        }
      }));
      setMessage(payload?.message || `Unable to verify ${provider}`);
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
          consents={consents}
          linkedAccounts={linkedAccounts}
          integrationHealth={integrationHealth}
          riskMeta={riskMeta}
          governanceSummary={governanceSummary}
          liveVerification={liveVerification}
          decisionSummary={decisionSummary}
          activities={activities}
          onUpsertConsent={handleUpsertConsent}
          onRevokeConsent={handleRevokeConsent}
          onEvaluateDecision={handleEvaluateDecision}
          onConnectIntegration={handleConnectIntegration}
          onDisconnectIntegration={handleDisconnectIntegration}
          onVerifyIntegrationLive={handleVerifyIntegrationLive}
          onRefreshDashboard={bootstrapDashboard}
          onLogout={clearSession}
        />
      )}
    </main>
  );
}

export default App;
