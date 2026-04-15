import { useEffect, useMemo, useState } from "react";
import AppCard from "../components/AppCard";

const toTitleCase = (value) =>
  String(value || "")
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");

function DashboardPage({
  user,
  consents,
  linkedAccounts,
  integrationHealth,
  riskMeta,
  governanceSummary,
  analysisBoard,
  liveVerification,
  decisionSummary,
  activities,
  onUpsertConsent,
  onRevokeConsent,
  onDeleteConsent,
  onEvaluateDecision,
  onConnectIntegration,
  onDisconnectIntegration,
  onVerifyIntegrationLive,
  onRefreshDashboard,
  onLogout
}) {
  const [activeSection, setActiveSection] = useState("dashboard");
  const navItems = [
    { key: "dashboard", label: "Dashboard", targetId: "section-dashboard" },
    { key: "integrations", label: "Integrations", targetId: "section-integrations" },
    { key: "policies", label: "Policies", targetId: "section-policies" },
    { key: "analysis", label: "Analysis", targetId: "section-analysis" },
    { key: "activity", label: "Activity", targetId: "section-activity" }
  ];

  const handleNavClick = (item) => {
    setActiveSection(item.key);
    const element = document.getElementById(item.targetId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const [newPolicy, setNewPolicy] = useState({
    appId: "",
    dataType: "",
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

  const providerCatalog = useMemo(() => {
    const map = new Map();

    for (const provider of integrationHealth?.providers || []) {
      map.set(provider.provider, {
        key: provider.provider,
        label: toTitleCase(provider.provider),
        configured: Boolean(provider.configured)
      });
    }

    for (const account of linkedAccounts) {
      if (!map.has(account.provider)) {
        map.set(account.provider, {
          key: account.provider,
          label: toTitleCase(account.provider),
          configured: true
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [integrationHealth, linkedAccounts]);

  const providerOptions = useMemo(() => {
    const uniqueLinkedProviders = new Map();

    for (const account of linkedAccounts) {
      if (!uniqueLinkedProviders.has(account.provider)) {
        uniqueLinkedProviders.set(account.provider, account);
      }
    }

    return Array.from(uniqueLinkedProviders.values()).map((account) => ({
      value: account.provider,
      label: account.displayName
        ? `${toTitleCase(account.provider)} (${account.displayName})`
        : toTitleCase(account.provider)
    }));
  }, [linkedAccounts]);

  const dataTypeOptions = useMemo(() => {
    const list = riskMeta?.supportedDataTypes || [];
    return list.length ? list : ["location", "health", "contacts", "email", "profile"];
  }, [riskMeta]);

  useEffect(() => {
    if (providerOptions.length === 0) {
      return;
    }

    setNewPolicy((prev) => {
      const hasCurrentOption = providerOptions.some((option) => option.value === prev.appId);
      if (hasCurrentOption) {
        return prev;
      }

      return {
        ...prev,
        appId: providerOptions[0].value
      };
    });
  }, [providerOptions]);

  useEffect(() => {
    if (dataTypeOptions.length === 0) {
      return;
    }

    setNewPolicy((prev) => {
      if (dataTypeOptions.includes(prev.dataType)) {
        return prev;
      }

      return {
        ...prev,
        dataType: dataTypeOptions[0]
      };
    });
  }, [dataTypeOptions]);

  const activeCount = consents.filter((consent) => consent.effectiveStatus === "allowed").length;
  const deniedCount = consents.length - activeCount;
  const consentRate = consents.length ? Math.round((activeCount / consents.length) * 100) : 0;

  const statusChecklist = [
    {
      label: "Configuration",
      details: integrationHealth?.jwtSecretConfigured
        ? "JWT and integration settings are configured."
        : "Backend JWT/integration configuration is incomplete.",
      ok: Boolean(integrationHealth?.jwtSecretConfigured)
    },
    {
      label: "Integration",
      details: linkedAccounts.length
        ? `${linkedAccounts.length} provider account(s) connected.`
        : "No live provider connected yet.",
      ok: linkedAccounts.length > 0
    },
    {
      label: "Verification",
      details: Object.values(liveVerification || {}).some((item) => item?.verified)
        ? "Live verification completed for at least one integration."
        : "Run Verify Live on a provider to validate real-time access.",
      ok: Object.values(liveVerification || {}).some((item) => item?.verified)
    }
  ];

  const interactionSeries = useMemo(() => {
    const last = [...activities].slice(0, 18).reverse();
    if (!last.length) {
      return [14, 12, 16, 11, 17, 10, 19, 13, 15, 14, 20, 16, 18, 17, 19, 18, 21, 20];
    }

    const maxDuration = Math.max(...last.map((item) => item.duration || 1));
    return last.map((item) => Math.max(2, Math.round(((item.duration || 0) / maxDuration) * 24)));
  }, [activities]);

  const linePath = useMemo(() => {
    const points = interactionSeries.map((value, index) => {
      const x = index * (560 / Math.max(interactionSeries.length - 1, 1));
      const y = 120 - value * 3.5;
      return `${x},${y}`;
    });

    return points.join(" ");
  }, [interactionSeries]);

  const getIndicatorClass = (indicator) => {
    if (indicator === "RED") return "risk-pill risk-pill--red";
    if (indicator === "YELLOW") return "risk-pill risk-pill--yellow";
    return "risk-pill risk-pill--green";
  };

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

    setNewPolicy((prev) => ({ ...prev, conditions: "", expiry: "" }));
  };

  return (
    <div className="shell-layout">
      <aside className="left-nav">
        <div className="brand">PrivSyncro</div>
        <nav>
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`nav-item ${activeSection === item.key ? "nav-item--active" : ""}`}
              onClick={() => handleNavClick(item)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="help-card">
          <h4>Need help?</h4>
          <p>Check support docs for policy setup and verification flows.</p>
          <button className="btn btn-secondary">Contact Support</button>
        </div>

        <button className="nav-item" onClick={onLogout}>
          Log out
        </button>
      </aside>

      <main className="main-pane">
        <header className="top-bar">
          <div>
            <h1>{user?.email || "workspace"}</h1>
            <p>Intelligent privacy dashboard</p>
          </div>
          <div className="top-actions">
            <button className="btn btn-secondary" onClick={onRefreshDashboard}>
              Refresh Data
            </button>
          </div>
        </header>

        <section id="section-dashboard" className="stats-row">
          <article className="metric-card">
            <p>Policy Displays</p>
            <h3>{consents.length}</h3>
          </article>
          <article className="metric-card">
            <p>Interaction Rate</p>
            <h3>{activities.length}</h3>
          </article>
          <article className="metric-card">
            <p>Connected Providers</p>
            <h3>{linkedAccounts.length}</h3>
          </article>
          <article className="metric-card metric-card--accent">
            <p>Consent Rate</p>
            <h3>{consentRate}%</h3>
          </article>
        </section>

        <section className="grid-main">
          <article className="panel-xl">
            <div className="panel-head">
              <h2>Interaction Balance</h2>
              <span className="status-ok">On track</span>
            </div>

            <div className="mini-metrics">
              <div>
                <small>Allowed Policies</small>
                <strong>{activeCount}</strong>
              </div>
              <div>
                <small>Denied Policies</small>
                <strong>{deniedCount}</strong>
              </div>
              <div>
                <small>Evaluated Apps</small>
                <strong>{decisionSummary.totals?.apps || 0}</strong>
              </div>
            </div>

            <svg className="line-chart" viewBox="0 0 560 140" preserveAspectRatio="none" aria-hidden="true">
              <polyline points={linePath} />
            </svg>
          </article>

          <article className="panel-status">
            <h2>Status</h2>
            <ul>
              {statusChecklist.map((item) => (
                <li key={item.label}>
                  <span className={item.ok ? "dot dot--ok" : "dot dot--warn"} />
                  <div>
                    <strong>{item.label}</strong>
                    <p>{item.details}</p>
                  </div>
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section id="section-integrations" className="panel">
          <div className="panel__head">
            <h2>Connected Providers</h2>
            <p>Connect, verify, and manage provider-level permissions.</p>
          </div>

          <div className="integration-grid">
            {providerCatalog.length === 0 && <p>No providers configured yet.</p>}
            {providerCatalog.map((provider) => {
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

                      <div className="card-actions">
                        <button className="btn btn-secondary" onClick={() => onDisconnectIntegration(provider.key)}>
                          Revoke in PrivSyncro
                        </button>
                        {linked.providerManageUrl && (
                          <a className="btn btn-linkout" href={linked.providerManageUrl} target="_blank" rel="noreferrer">
                            Manage in Provider
                          </a>
                        )}
                        <button className="btn btn-secondary" onClick={() => onVerifyIntegrationLive(provider.key)}>
                          Verify Live
                        </button>
                      </div>

                      {liveVerification?.[provider.key] && (
                        <div className="verification-box">
                          {liveVerification[provider.key].verified ? (
                            <>
                              <p>
                                Live verified at {new Date(liveVerification[provider.key].verifiedAt).toLocaleString()}
                              </p>
                              <small>
                                Profile: {liveVerification[provider.key].liveProfile?.displayName || "Account"}
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
                      <button
                        className="btn"
                        onClick={() => onConnectIntegration(provider.key)}
                        disabled={!provider.configured}
                      >
                        Connect {provider.label}
                      </button>
                      {!provider.configured && <small>Provider setup is incomplete in backend env.</small>}
                    </>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section id="section-policies" className="panel panel--split">
          <div>
            <h2>Create Consent Policy</h2>
            {providerOptions.length === 0 && (
              <p>Connect and verify at least one provider to create a consent policy.</p>
            )}
            <form className="connect-form" onSubmit={handleCreatePolicy}>
              <label>
                Provider
                <select
                  value={newPolicy.appId}
                  onChange={(event) => setNewPolicy((prev) => ({ ...prev, appId: event.target.value }))}
                  disabled={providerOptions.length === 0}
                  required
                >
                  {providerOptions.length === 0 ? (
                    <option value="">No connected apps</option>
                  ) : (
                    providerOptions.map((option) => (
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
                  {dataTypeOptions.map((dataType) => (
                    <option key={dataType} value={dataType}>
                      {dataType}
                    </option>
                  ))}
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
                Expiry
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

              <button
                className="btn"
                type="submit"
                disabled={providerOptions.length === 0 || !newPolicy.appId.trim() || !newPolicy.dataType.trim()}
              >
                Save Policy
              </button>
            </form>
          </div>

          <div className="consent-board">
            <h2>Policies & Decisions</h2>
            {consents.length === 0 ? (
              <p>No policies yet.</p>
            ) : (
              <div className="consent-grid">
                {consents.map((consent) => (
                  <AppCard
                    key={consent._id}
                    consent={consent}
                    appSummary={summaryByApp[consent.appId]}
                    onUpsert={onUpsertConsent}
                    onRevoke={onRevokeConsent}
                    onDelete={onDeleteConsent}
                    onEvaluateDecision={onEvaluateDecision}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <section id="section-analysis" className="panel">
          <div className="panel__head">
            <h2>{analysisBoard?.title || "Data & Risk Analysis Board"}</h2>
            <p>
              {analysisBoard?.subtitle ||
                "Unified app-wise risk, anomaly traffic detection, and AI-driven governance insights."}
            </p>
          </div>

          <div className="mini-metrics">
            <div>
              <small>Apps Monitored</small>
              <strong>{analysisBoard?.overall?.totalApps || 0}</strong>
            </div>
            <div>
              <small>Avg Risk</small>
              <strong>{Number(analysisBoard?.overall?.averageRiskAcrossApps || 0).toFixed(2)}</strong>
            </div>
            <div>
              <small>Avg Anomaly</small>
              <strong>{Number(analysisBoard?.overall?.averageAnomalyTraffic || 0).toFixed(2)}</strong>
            </div>
            <div>
              <small>Suspicious Transfers (30d)</small>
              <strong>{analysisBoard?.overall?.suspiciousTransfers || 0}</strong>
            </div>
          </div>

          {analysisBoard?.appAnalyses?.length ? (
            <div className="decision-grid">
              {analysisBoard.appAnalyses.map((item) => (
                <article className="decision-card" key={item.appId}>
                  <div className="decision-card__top">
                    <h3>{item.appId}</h3>
                    <span
                      className={getIndicatorClass(
                        item.anomalyTrafficScore > 0.7 ? "RED" : item.anomalyTrafficScore > 0.5 ? "YELLOW" : "GREEN"
                      )}
                    >
                      Anomaly {Number(item.anomalyTrafficScore).toFixed(2)}
                    </span>
                  </div>
                  <p>Average Risk: {Number(item.averageRisk).toFixed(2)}</p>
                  <p>
                    Traffic 24h: {item.traffic?.last24h || 0} | Prev 24h: {item.traffic?.prev24h || 0}
                  </p>
                  <p>Suspicious Transfers (30d): {item.suspiciousTransfers || 0}</p>
                  <small>
                    {item.highRiskDataTypes?.length
                      ? `High-risk data: ${item.highRiskDataTypes.join(", ")}`
                      : "No high-risk data types flagged"}
                  </small>
                </article>
              ))}
            </div>
          ) : (
            <p>No analysis data yet.</p>
          )}

          <div className="panel__head" style={{ marginTop: "0.85rem" }}>
            <h2>AI Insights</h2>
            <p>Adaptive recommendations based on observed risk and traffic behavior.</p>
          </div>
          {analysisBoard?.aiInsights?.length ? (
            <ul className="integration-scope-list">
              {analysisBoard.aiInsights.map((insight, index) => (
                <li key={`${index}-${insight}`}>{insight}</li>
              ))}
            </ul>
          ) : (
            <p>No AI insights available yet.</p>
          )}
        </section>

        <section id="section-activity" className="panel">
          <div className="panel__head">
            <h2>{governanceSummary?.title || "Adaptive Governance"}</h2>
            <p>
              {governanceSummary?.subtitle ||
                "Enabling measurable privacy improvement and intelligent consent control."}
            </p>
          </div>

          <div className="mini-metrics">
            <div>
              <small>Baseline Risk</small>
              <strong>{Number(governanceSummary?.overall?.baselineRisk || 0).toFixed(2)}</strong>
            </div>
            <div>
              <small>Optimized Risk</small>
              <strong>{Number(governanceSummary?.overall?.optimizedRisk || 0).toFixed(2)}</strong>
            </div>
            <div>
              <small>Privacy Improvement</small>
              <strong>{Number(governanceSummary?.overall?.measurablePrivacyImprovementPct || 0).toFixed(1)}%</strong>
            </div>
          </div>

          {governanceSummary?.recommendations?.length ? (
            <div className="decision-grid">
              {governanceSummary.recommendations.slice(0, 6).map((item) => (
                <article className="decision-card" key={`${item.appId}-${item.dataType}`}>
                  <div className="decision-card__top">
                    <h3>
                      {item.appId} · {item.dataType}
                    </h3>
                    <span className={getIndicatorClass(item.priority === "HIGH" ? "RED" : item.priority === "MEDIUM" ? "YELLOW" : "GREEN")}>
                      {item.priority}
                    </span>
                  </div>
                  <p>
                    Current: {Number(item.currentRisk).toFixed(2)} -> Optimized: {Number(item.optimizedRisk).toFixed(2)}
                  </p>
                  <small>{item.recommendedControls?.[0] || "No action required"}</small>
                </article>
              ))}
            </div>
          ) : (
            <p>No governance recommendations yet.</p>
          )}
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2>Risk Decision Board</h2>
            <p>Recommended actions from privacy engine.</p>
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
            <p>No risk evaluations available yet.</p>
          )}
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2>Activity Logs</h2>
            <p>Recent accesses used for anomaly and frequency analysis.</p>
          </div>

          {activities.length ? (
            <div className="activity-table-wrap">
              <table className="activity-table">
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>Data Type</th>
                    <th>Timestamp</th>
                    <th>Duration (s)</th>
                    <th>Payload (KB)</th>
                    <th>Location</th>
                    <th>Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((item) => (
                    <tr key={item._id}>
                      <td>{item.appId}</td>
                      <td>{item.dataType}</td>
                      <td>{new Date(item.timestamp).toLocaleString()}</td>
                      <td>{item.duration}</td>
                      <td>{item.payloadSizeKb ?? 0}</td>
                      <td>
                        {Number.isFinite(item.location?.lat) && Number.isFinite(item.location?.lng)
                          ? `${item.location.lat}, ${item.location.lng}`
                          : "-"}
                      </td>
                      <td>{item.transferFlags?.length ? item.transferFlags.join(", ") : "-"}</td>
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
