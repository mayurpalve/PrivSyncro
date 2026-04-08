import { useMemo, useState } from "react";
import AppCard from "../components/AppCard";

function DashboardPage({
  user,
  apps,
  consents,
  linkedAccounts,
  onSyncConsent,
  onTogglePermission,
  onRevokeConsent,
  onUpdateExpiry,
  onConnectIntegration,
  onDisconnectIntegration,
  onLogout
}) {
  const [selectedAppId, setSelectedAppId] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const connectedAppIds = useMemo(() => new Set(consents.map((consent) => consent.appId?._id)), [consents]);
  const availableApps = apps.filter((app) => !connectedAppIds.has(app._id));

  const activeCount = consents.filter((consent) => consent.isActive && !consent.isExpired).length;
  const revokedCount = consents.filter((consent) => !consent.isActive || consent.isExpired).length;
  const permissionsCount = consents.reduce((total, consent) => total + consent.permissions.length, 0);

  const handleConnectApp = async (event) => {
    event.preventDefault();
    if (!selectedAppId) return;

    await onSyncConsent({
      appId: selectedAppId,
      permissions: [],
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null
    });

    setSelectedAppId("");
    setExpiresAt("");
  };

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <h2>PrivSyncro</h2>
        <p className="sidebar__tag">Intelligent Privacy Command Center</p>
        <nav className="sidebar__nav">
          <a href="#overview">Overview</a>
          <a href="#integrations">Live Integrations</a>
          <a href="#consents">Consent Policies</a>
        </nav>
        <button className="btn btn-secondary" onClick={onLogout}>
          Logout
        </button>
      </aside>

      <main className="workspace">
        <header id="overview" className="workspace__header">
          <div>
            <p className="eyebrow">Security workspace</p>
            <h1>Welcome back, {user?.name || "User"}</h1>
            <p>Monitor account links, permission scopes, and revocations in one place.</p>
          </div>
        </header>

        <section className="kpi-grid">
          <article className="kpi-card">
            <p>Active Consents</p>
            <h3>{activeCount}</h3>
          </article>
          <article className="kpi-card">
            <p>Revoked / Expired</p>
            <h3>{revokedCount}</h3>
          </article>
          <article className="kpi-card">
            <p>Total Granted Permissions</p>
            <h3>{permissionsCount}</h3>
          </article>
          <article className="kpi-card">
            <p>Live Linked Accounts</p>
            <h3>{linkedAccounts.length}</h3>
          </article>
        </section>

        <section id="integrations" className="panel">
          <div className="panel__head">
            <h2>Live Integrations</h2>
            <p>Connect your real Spotify and Google accounts via OAuth.</p>
          </div>

          <div className="integration-grid">
            {[
              { key: "spotify", label: "Spotify" },
              { key: "google", label: "Google Fit" }
            ].map((provider) => {
              const linked = linkedAccounts.find((item) => item.provider === provider.key);

              return (
                <article key={provider.key} className="integration-card">
                  <h3>{provider.label}</h3>
                  {linked ? (
                    <>
                      <p>Connected as {linked.displayName || linked.email || "Account"}</p>
                      <small>Last sync: {new Date(linked.updatedAt).toLocaleString()}</small>
                      <button className="btn btn-secondary" onClick={() => onDisconnectIntegration(provider.key)}>
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <>
                      <p>Not connected</p>
                      <button className="btn" onClick={() => onConnectIntegration(provider.key)}>
                        Connect {provider.label}
                      </button>
                    </>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section id="consents" className="panel panel--split">
          <div>
            <h2>Create Consent</h2>
            <form className="connect-form" onSubmit={handleConnectApp}>
              <select value={selectedAppId} onChange={(event) => setSelectedAppId(event.target.value)}>
                <option value="">Select connected application</option>
                {availableApps.map((app) => (
                  <option key={app._id} value={app._id}>
                    {app.name} ({app.provider})
                  </option>
                ))}
              </select>
              <input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
              <button className="btn" type="submit" disabled={!selectedAppId}>
                Create Consent Record
              </button>
            </form>
          </div>

          <div className="consent-board">
            <h2>Consent Policies</h2>
            {consents.length === 0 ? (
              <p>No consent records yet. Create one to start policy control.</p>
            ) : (
              <div className="consent-grid">
                {consents.map((consent) => (
                  <AppCard
                    key={consent._id}
                    consent={consent}
                    onTogglePermission={onTogglePermission}
                    onRevoke={onRevokeConsent}
                    onUpdateExpiry={onUpdateExpiry}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default DashboardPage;