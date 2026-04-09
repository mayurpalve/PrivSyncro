import { useEffect, useMemo, useState } from "react";
import AppCard from "../components/AppCard";

function DashboardPage({
  user,
  consents,
  linkedAccounts,
  liveVerification,
  decisionSummary,
  activities,
  onUpsertConsent,
  onRevokeConsent,
  onEvaluateDecision,
  onConnectIntegration,
  onDisconnectIntegration,
  onVerifyIntegrationLive,
  onRefreshDashboard,
  onLogout
}) {
  const [newPolicy, setNewPolicy] = useState({
    appId: "",
    dataType: "location",
    status: "allowed",
    expiry: "",
    conditions: ""
  });

  const summaryByApp = useMemo(() => {
    const map = {};
    for (const item of decisionSummary.appSummaries || []) {
      map[item.appId] = item;
    }
    return map;
  }, [decisionSummary]);

  const activeCount = consents.filter((consent) => consent.effectiveStatus === "allowed").length;
  const deniedCount = consents.length - activeCount;
  const linkedAppOptions = useMemo(() => {
    const unique = new Map();

    for (const account of linkedAccounts) {
      if (!unique.has(account.provider)) {
        unique.set(account.provider, account);
      }
    }

    return Array.from(unique.values()).map((account) => ({
      value: account.provider,
      label: account.displayName
        ? `${account.provider} (${account.displayName})`
        : account.provider
    }));
  }, [linkedAccounts]);

  useEffect(() => {
    if (!newPolicy.appId && linkedAppOptions.length > 0) {
      setNewPolicy((prev) => ({ ...prev, appId: linkedAppOptions[0].value }));
    }
  }, [linkedAppOptions, newPolicy.appId]);

  const handleCreatePolicy = async (event) => {
    event.preventDefault();

    if (!newPolicy.appId.trim() || !newPolicy.dataType.trim()) {
      return;
    }

    await onUpsertConsent({
      appId: newPolicy.appId.trim(),
      dataType: newPolicy.dataType.trim().toLowerCase(),
      status: newPolicy.status,
      expiry: newPolicy.expiry ? new Date(newPolicy.expiry).toISOString() : null,
      conditions: newPolicy.conditions || null
    });

    setNewPolicy({
      appId: "",
      dataType: "location",
      status: "allowed",
      expiry: "",
      conditions: ""
    });
  };

  const getIndicatorClass = (indicator) => {
    if (indicator === "RED") return "risk-badge risk-badge--red";
    if (indicator === "YELLOW") return "risk-badge risk-badge--yellow";
    return "risk-badge risk-badge--green";
  };

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <h2>PrivSyncro</h2>
        <p className="sidebar__tag">Intelligent Privacy Command Center</p>
        <nav className="sidebar__nav">
          <a href="#overview">Overview</a>
          <a href="#integrations">Integrations</a>
          <a href="#consents">Consent Policies</a>
          <a href="#risk">Risk & Decision</a>
          <a href="#activity">Activity Logs</a>
        </nav>
        <button className="btn btn-secondary" onClick={onRefreshDashboard}>
          Refresh
        </button>
        <button className="btn btn-secondary" onClick={onLogout}>
          Logout
        </button>
      </aside>

      <main className="workspace">
        <header id="overview" className="workspace__header">
          <div>
            <p className="eyebrow">Privacy Decision Workspace</p>
            <h1>Welcome back, {user?.name || "User"}</h1>
            <p>Manage live integrations, consent policies, risk posture, and access decisions in one panel.</p>
          </div>
        </header>

        <section className="kpi-grid">
          <article className="kpi-card">
            <p>Active Consent Policies</p>
            <h3>{activeCount}</h3>
          </article>
          <article className="kpi-card">
            <p>Denied / Revoked Policies</p>
            <h3>{deniedCount}</h3>
          </article>
          <article className="kpi-card">
            <p>Risk-scored Apps</p>
            <h3>{decisionSummary.totals?.apps || 0}</h3>
          </article>
          <article className="kpi-card">
            <p>Linked Accounts</p>
            <h3>{linkedAccounts.length}</h3>
          </article>
        </section>

        <section id="integrations" className="panel">
          <div className="panel__head">
            <h2>Connected via PrivSyncro</h2>
            <p>
              Manage integrations connected through PrivSyncro and open provider settings for external app
              permissions.
            </p>
          </div>

          <div className="integration-grid">
            {[
              { key: "spotify", label: "Spotify" },
              { key: "google", label: "Google" }
            ].map((provider) => {
              const linked = linkedAccounts.find((item) => item.provider === provider.key);

              return (
                <article key={provider.key} className="integration-card">
                  <h3>{provider.label}</h3>
                  {linked ? (
                    <>
                      <span className="manager-badge">Managed in PrivSyncro</span>
                      <p>Connected as {linked.displayName || linked.email || "Account"}</p>
                      <small>Last sync: {new Date(linked.updatedAt).toLocaleString()}</small>
                      <div className="integration-permissions">
                        <p>Granted permissions</p>
                        {linked.grantedPermissions?.length ? (
                          <ul className="integration-scope-list">
                            {linked.grantedPermissions.map((permission) => (
                              <li key={permission.scope}>{permission.label}</li>
                            ))}
                          </ul>
                        ) : (
                          <small>No permission scopes returned by provider.</small>
                        )}
                      </div>
                      <button className="btn btn-secondary" onClick={() => onDisconnectIntegration(provider.key)}>
                        Revoke in PrivSyncro
                      </button>
                      {linked.providerManageUrl && (
                        <a
                          className="btn btn-linkout"
                          href={linked.providerManageUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Manage in {provider.label}
                        </a>
                      )}
                      <button className="btn btn-secondary" onClick={() => onVerifyIntegrationLive(provider.key)}>
                        Verify Live
                      </button>
                      {liveVerification?.[provider.key] && (
                        <div className="verification-box">
                          {liveVerification[provider.key].verified ? (
                            <>
                              <p>
                                Live verified at{" "}
                                {new Date(liveVerification[provider.key].verifiedAt).toLocaleString()}
                              </p>
                              <small>
                                Profile:{" "}
                                {liveVerification[provider.key].liveProfile?.displayName ||
                                  liveVerification[provider.key].liveProfile?.email ||
                                  "Account"}
                              </small>
                            </>
                          ) : (
                            <small>
                              Verification failed: {liveVerification[provider.key].detail || "Unknown error"}
                            </small>
                          )}
                        </div>
                      )}
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
            <h2>Create Consent Policy</h2>
            {linkedAppOptions.length === 0 && (
              <p>Connect at least one integration first to create a consent policy.</p>
            )}
            <form className="connect-form" onSubmit={handleCreatePolicy}>
              <label>
                App ID
                <select
                  value={newPolicy.appId}
                  onChange={(event) => setNewPolicy((prev) => ({ ...prev, appId: event.target.value }))}
                  disabled={linkedAppOptions.length === 0}
                  required
                >
                  {linkedAppOptions.length === 0 ? (
                    <option value="">No connected apps</option>
                  ) : (
                    linkedAppOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))
                  )}
                </select>
              </label>

              <label>
                Data Type
                <select
                  value={newPolicy.dataType}
                  onChange={(event) => setNewPolicy((prev) => ({ ...prev, dataType: event.target.value }))}
                >
                  <option value="location">location</option>
                  <option value="health">health</option>
                  <option value="contacts">contacts</option>
                  <option value="email">email</option>
                  <option value="profile">profile</option>
                </select>
              </label>

              <label>
                Status
                <select
                  value={newPolicy.status}
                  onChange={(event) => setNewPolicy((prev) => ({ ...prev, status: event.target.value }))}
                >
                  <option value="allowed">allowed</option>
                  <option value="denied">denied</option>
                </select>
              </label>

              <label>
                Expiry (optional)
                <input
                  type="datetime-local"
                  value={newPolicy.expiry}
                  onChange={(event) => setNewPolicy((prev) => ({ ...prev, expiry: event.target.value }))}
                />
              </label>

              <label>
                Conditions
                <input
                  type="text"
                  placeholder="daytime only"
                  value={newPolicy.conditions}
                  onChange={(event) => setNewPolicy((prev) => ({ ...prev, conditions: event.target.value }))}
                />
              </label>

              <button className="btn" type="submit" disabled={linkedAppOptions.length === 0}>
                Save Policy
              </button>
            </form>
          </div>

          <div className="consent-board">
            <h2>Consent Policies</h2>
            {consents.length === 0 ? (
              <p>No policies yet. Create one to start decision-based privacy control.</p>
            ) : (
              <div className="consent-grid">
                {consents.map((consent) => (
                  <AppCard
                    key={consent._id}
                    consent={consent}
                    appSummary={summaryByApp[consent.appId]}
                    onUpsert={onUpsertConsent}
                    onRevoke={onRevokeConsent}
                    onEvaluateDecision={onEvaluateDecision}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <section id="risk" className="panel">
          <div className="panel__head">
            <h2>Risk & Decision Status</h2>
            <p>System-generated recommendation from privacy risk model.</p>
          </div>

          {decisionSummary.appSummaries?.length ? (
            <div className="decision-grid">
              {decisionSummary.appSummaries.map((summary) => (
                <article className="decision-card" key={summary.appId}>
                  <div className="decision-card__top">
                    <h3>{summary.appId}</h3>
                    <span className={getIndicatorClass(summary.indicator)}>{summary.indicator}</span>
                  </div>
                  <p>Decision: {summary.overallDecision}</p>
                  <p>Risk Score: {summary.overallRiskScore.toFixed(2)}</p>
                  <small>{summary.recommendedAction}</small>
                </article>
              ))}
            </div>
          ) : (
            <p>No risk evaluations available yet. Add consent policies and evaluate decisions.</p>
          )}
        </section>

        <section id="activity" className="panel">
          <div className="panel__head">
            <h2>Activity Logs</h2>
            <p>Recent data access history used by frequency and anomaly calculations.</p>
          </div>

          {activities.length ? (
            <div className="activity-table-wrap">
              <table className="activity-table">
                <thead>
                  <tr>
                    <th>App</th>
                    <th>Data Type</th>
                    <th>Timestamp</th>
                    <th>Duration (s)</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((item) => (
                    <tr key={item._id}>
                      <td>{item.appId}</td>
                      <td>{item.dataType}</td>
                      <td>{new Date(item.timestamp).toLocaleString()}</td>
                      <td>{item.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No activity logs yet.</p>
          )}
        </section>
      </main>
    </div>
  );
}

export default DashboardPage;
