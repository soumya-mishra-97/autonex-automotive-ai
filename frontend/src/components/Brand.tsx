export function Brand({ small = false }: { small?: boolean }) {
  return (
    <span className={`brand ${small ? "brand-small" : ""}`}>
      <span className="brand-mark" aria-hidden="true">
        A<span>↗</span>
      </span>
      {!small && (
        <span className="brand-name">
          AUTONEX <em>AI</em>
          <small>ENTERPRISE AUTOMOTIVE AI ORCHESTRATION</small>
        </span>
      )}
    </span>
  );
}
