'use client';

const TIER_CLASS = {
  primary: 'panel-primary',
  secondary: 'panel-secondary',
  info: 'panel-info',
};

const ACCENT_CLASS = {
  green: 'panel-accent-green',
  amber: 'panel-accent-amber',
  cyan: 'panel-accent-cyan',
  red: 'panel-accent-red',
};

export default function Panel({ label, icon, badge, badgeType, tier, accent, children, className = '' }) {
  const tierClass = TIER_CLASS[tier] || '';
  const accentClass = ACCENT_CLASS[accent] || '';
  const hasHeader = icon || label || badge;

  return (
    <div className={`panel overflow-hidden flex flex-col ${tierClass} ${accentClass} ${className}`}>
      {hasHeader ? (
        <>
          <div className="panel-header">
            {icon && <span className="panel-icon">{icon}</span>}
            {label && <span className="panel-title">{label}</span>}
            {badge && (
              <span className={`panel-badge ${
                badgeType === 'warn' ? 'panel-badge-warn' :
                badgeType === 'danger' ? 'panel-badge-danger' : ''
              }`}>{badge}</span>
            )}
          </div>
          <div className="p-3 flex-1 min-h-0 overflow-auto scrollbar-terminal">
            {children}
          </div>
        </>
      ) : (
        <div className="p-2 pt-3 flex-1 min-h-0 overflow-auto scrollbar-terminal">
          {children}
        </div>
      )}
    </div>
  );
}
