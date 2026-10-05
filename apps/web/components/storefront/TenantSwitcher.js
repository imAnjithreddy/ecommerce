'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export default function TenantSwitcher({ currentTenant }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSwitch = (slug) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tenant', slug);
    router.push(`/?${params.toString()}`);
  };

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      background: 'rgba(255, 255, 255, 0.08)',
      padding: '4px 10px',
      borderRadius: '20px',
      fontSize: '12px',
      border: '1px solid var(--border-subtle)'
    }}>
      <span style={{ color: 'var(--text-muted)' }}>Tenant Store:</span>
      <button
        type="button"
        onClick={() => handleSwitch('aurora')}
        style={{
          background: currentTenant?.slug === 'aurora' ? 'var(--theme-primary)' : 'transparent',
          color: currentTenant?.slug === 'aurora' ? '#fff' : 'var(--text-secondary)',
          border: 'none',
          padding: '2px 8px',
          borderRadius: '12px',
          cursor: 'pointer',
          fontWeight: currentTenant?.slug === 'aurora' ? '700' : '500'
        }}
      >
        ✨ Aurora (Fashion)
      </button>
      <button
        type="button"
        onClick={() => handleSwitch('volt')}
        style={{
          background: currentTenant?.slug === 'volt' ? 'var(--theme-primary)' : 'transparent',
          color: currentTenant?.slug === 'volt' ? '#fff' : 'var(--text-secondary)',
          border: 'none',
          padding: '2px 8px',
          borderRadius: '12px',
          cursor: 'pointer',
          fontWeight: currentTenant?.slug === 'volt' ? '700' : '500'
        }}
      >
        ⚡ Volt (Electronics)
      </button>
    </div>
  );
}
