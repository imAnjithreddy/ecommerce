'use client';

import Link from 'next/link';

export default function PlatformLayout({ children }) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar" style={{ background: '#030712' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '800',
            color: '#fff'
          }}>
            P
          </div>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: '700' }}>Platform Admin</h2>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>DTabs Global SaaS</span>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '16px' }}>
          <Link href="/platform/dashboard" className="admin-nav-item active">
            🌐 Global Overview
          </Link>
          <Link href="/admin/dashboard?tenant=aurora" className="admin-nav-item">
            🏪 Storefront Admin Demo
          </Link>
        </nav>

        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', fontSize: '12px' }}>
          <Link href="/" style={{ color: 'var(--text-muted)' }}>
            &larr; Exit to Storefront
          </Link>
        </div>
      </aside>

      <main className="admin-content">
        {children}
      </main>
    </div>
  );
}
