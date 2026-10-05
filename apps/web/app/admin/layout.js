'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

function AdminNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tenantSlug = searchParams.get('tenant') || 'aurora';
  const tenantParam = `?tenant=${tenantSlug}`;

  const navItems = [
    { label: '📊 Dashboard', href: `/admin/dashboard${tenantParam}` },
    { label: '📦 Products', href: `/admin/products${tenantParam}` },
    { label: '📋 Orders', href: `/admin/orders${tenantParam}` },
    { label: '🏷️ Inventory', href: `/admin/inventory${tenantParam}` },
    { label: '🎟️ Coupons', href: `/admin/coupons${tenantParam}` },
    { label: '🎨 Themes', href: `/admin/themes${tenantParam}` },
    { label: '⚙️ Settings', href: `/admin/settings${tenantParam}` }
  ];

  return (
    <aside className="admin-sidebar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: '800',
          color: '#fff'
        }}>
          D
        </div>
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: '700' }}>Store Admin</h2>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{tenantSlug}.dtabs.tech</span>
        </div>
      </div>

      <Link
        href={`/${tenantParam}`}
        target="_blank"
        className="btn btn-secondary"
        style={{ width: '100%', padding: '8px 12px', fontSize: '12px', textAlign: 'center' }}
      >
        👁️ View Live Storefront
      </Link>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href.split('?')[0];
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`admin-nav-item ${isActive ? 'active' : ''}`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', fontSize: '12px' }}>
        <Link href="/onboarding" style={{ color: 'var(--theme-accent)', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
          + Create Another Store
        </Link>
        <Link href="/login" style={{ color: 'var(--text-muted)' }}>
          Sign Out
        </Link>
      </div>
    </aside>
  );
}

export default function AdminLayout({ children }) {
  return (
    <div className="admin-shell">
      <Suspense fallback={<aside className="admin-sidebar" style={{ width: '260px' }}></aside>}>
        <AdminNav />
      </Suspense>
      <main className="admin-content">
        <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Loading admin module...</div>}>
          {children}
        </Suspense>
      </main>
    </div>
  );
}
