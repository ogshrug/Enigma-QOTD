export function SkeletonText({ rows = 3, className = '' }) {
  return (
    <div className={className} aria-hidden="true">
      <div className="skeleton skeleton-line lg" />
      <div className="skeleton skeleton-line xs" />
      {Array.from({ length: Math.max(0, rows) }).map((_, i) => (
        <div key={i} className="skeleton skeleton-line" style={{ width: `${92 - i * 7}%` }} />
      ))}
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <SkeletonText rows={3} />
    </div>
  )
}

export function SkeletonKpis() {
  return (
    <div className="row" style={{ marginTop: 0 }} aria-hidden="true">
      <div className="skeleton skeleton-kpi skeleton-card" style={{ marginBottom: 0 }} />
      <div className="skeleton skeleton-kpi skeleton-card" style={{ marginBottom: 0 }} />
      <div className="skeleton skeleton-kpi skeleton-card" style={{ marginBottom: 0 }} />
    </div>
  )
}