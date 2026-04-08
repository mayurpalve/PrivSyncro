function AppCard({ consent, onTogglePermission, onRevoke, onUpdateExpiry }) {
  const { _id, appId, permissions, expiresAt, isActive, isExpired } = consent;

  const handleExpiryChange = async (event) => {
    const value = event.target.value;
    await onUpdateExpiry(_id, value ? new Date(value).toISOString() : null);
  };

  const localExpiry = expiresAt ? new Date(expiresAt).toISOString().slice(0, 16) : "";

  return (
    <article className="consent-card">
      <div className="consent-card__top">
        <div>
          <h3>{appId?.name || "Unknown App"}</h3>
          <p>{appId?.provider || "Unknown Provider"}</p>
        </div>
        <span className={`status-chip ${isActive ? "status-chip--active" : "status-chip--inactive"}`}>
          {isExpired ? "Expired" : isActive ? "Active" : "Revoked"}
        </span>
      </div>

      <div className="permission-list">
        {(appId?.permissions || []).map((permission) => (
          <label key={permission} className="permission-toggle">
            <input
              type="checkbox"
              checked={permissions.includes(permission)}
              onChange={() => onTogglePermission(_id, permission)}
            />
            <span>{permission.replace(/_/g, " ")}</span>
          </label>
        ))}
      </div>

      <div className="consent-card__bottom">
        <label>
          Consent expiry
          <input type="datetime-local" value={localExpiry} onChange={handleExpiryChange} />
        </label>
        <button className="btn btn-danger" onClick={() => onRevoke(_id)}>
          Revoke Access
        </button>
      </div>
    </article>
  );
}

export default AppCard;