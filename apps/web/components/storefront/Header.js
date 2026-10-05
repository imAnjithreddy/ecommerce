'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import TenantSwitcher from './TenantSwitcher';

export default function Header({ tenant }) {
  const searchParams = useSearchParams();
  const tenantParam = searchParams.get('tenant') ? `?tenant=${searchParams.get('tenant')}` : '';

  return (
    <header className="glass-header">
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '70px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <Link href={`/${tenantParam}`} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-accent))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '800',
              fontSize: '18px',
              color: '#ffffff'
            }}>
              {tenant?.name?.charAt(0) || 'D'}
            </div>
            <span style={{ fontSize: '18px', fontWeight: '700', letterSpacing: '-0.02em' }}>
              {tenant?.settings?.storeName || tenant?.name || 'DTabs Store'}
            </span>
          </Link>

          <nav style={{ display: 'flex', gap: '16px', marginLeft: '12px' }}>
            <Link href={`/products${tenantParam}`} style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '500' }}>
              Catalog
            </Link>
            <Link href={`/admin/dashboard${tenantParam}`} style={{ color: 'var(--theme-accent)', fontSize: '14px', fontWeight: '600' }}>
              Store Admin
            </Link>
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <TenantSwitcher currentTenant={tenant} />

          <Link href={`/cart${tenantParam}`} className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '13px' }}>
            🛒 Cart
          </Link>

          <Link href={`/login${tenantParam}`} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
            Sign In
          </Link>
        </div>
      </div>
    </header>
  );
}
