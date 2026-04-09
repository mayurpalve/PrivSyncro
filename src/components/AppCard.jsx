function normalizeConditionsInput(value) {
  if (!value || !value.trim()) {
    return null;
  }

  const text = value.trim();
  if (text.startsWith("{") || text.startsWith("[")) {
    try {
      return JSON.parse(text);
    } catch (_error) {
      return text;
    }
  }

  return text;
}

function AppCard({ consent, appSummary, onUpsert, onRevoke, onEvaluateDecision }) {
  const { _id, appId, dataType, status, expiry, conditions, effectiveStatus, isExpired } = consent;

  const initialExpiry = expiry ? new Date(expiry).toISOString().slice(0, 16) : "";
  const initialConditions =
    typeof conditions === "object" && conditions !== null
      ? JSON.stringify(conditions)
      : conditions || "";

  const handleSave = async (event) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    await onUpsert({
      appId,
      dataType,
      status: formData.get("status"),
      expiry: formData.get("expiry") ? new Date(formData.get("expiry")).toISOString() : null,
      conditions: normalizeConditionsInput(formData.get("conditions"))
    });
  };

  const decisionLabel = appSummary?.overallDecision || "N/A";
  const riskLabel =
    typeof appSummary?.overallRiskScore === "number"
      ? appSummary.overallRiskScore.toFixed(2)
      : "N/A";

  return (
    <article className="consent-card">
      <div className="consent-card__top">
        <div>
          <h3>{appId}</h3>
          <p>Data type: {dataType}</p>
        </div>
        <span className={`status-chip ${effectiveStatus === "allowed" ? "status-chip--active" : "status-chip--inactive"}`}>
          {isExpired ? "Expired" : effectiveStatus}
        </span>
      </div>

      <p className="consent-meta">
        Decision: <strong>{decisionLabel}</strong> | Risk: <strong>{riskLabel}</strong>
      </p>

      <form className="consent-card__bottom" onSubmit={handleSave}>
        <label>
          Status
          <select name="status" defaultValue={status}>
            <option value="allowed">allowed</option>
            <option value="denied">denied</option>
          </select>
        </label>

        <label>
          Expiry
          <input type="datetime-local" name="expiry" defaultValue={initialExpiry} />
        </label>

        <label>
          Conditions (text or JSON)
          <input type="text" name="conditions" defaultValue={initialConditions} placeholder="daytime only" />
        </label>

        <div className="consent-actions">
          <button className="btn btn-secondary" type="submit">
            Save Policy
          </button>
          <button className="btn" type="button" onClick={() => onEvaluateDecision({ appId, dataType })}>
            Evaluate
          </button>
          <button className="btn btn-danger" type="button" onClick={() => onRevoke(_id)}>
            Revoke
          </button>
        </div>
      </form>
    </article>
  );
}

export default AppCard;