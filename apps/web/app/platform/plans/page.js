'use client';

export default function PlatformPlansPage() {
  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800' }}>SaaS Plans</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage subscription tiers and limits</p>
      </div>

      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Plan Management Coming Soon</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          This feature is currently under development.
        </p>
      </div>
    </div>
  );
}
