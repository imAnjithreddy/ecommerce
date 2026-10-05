import Link from 'next/link';

export default function Footer({ tenant }) {
  return (
    <footer style={{
      borderTop: '1px solid var(--border-subtle)',
      background: '#090d16',
      padding: '48px 0 32px 0',
      marginTop: '80px',
      fontSize: '14px',
      color: 'var(--text-muted)'
    }}>
      <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '32px' }}>
        <div>
          <h4 style={{ color: 'var(--text-primary)', marginBottom: '12px', fontSize: '16px' }}>
            {tenant?.name || 'DTabs Store'}
          </h4>
          <p style={{ lineHeight: '1.6', marginBottom: '16px' }}>
            Powered by DTabs Commerce multi-tenant SaaS architecture. Isolated data, customized themes, unified infrastructure.
          </p>
          <p style={{ fontSize: '12px' }}>Subdomain: <code>{tenant?.slug}.dtabs.tech</code></p>
        </div>

        <div>
          <h4 style={{ color: 'var(--text-primary)', marginBottom: '12px', fontSize: '15px' }}>Store Links</h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li><Link href={`/?tenant=${tenant?.slug}`}>Home</Link></li>
            <li><Link href={`/products?tenant=${tenant?.slug}`}>All Products</Link></li>
            <li><Link href={`/cart?tenant=${tenant?.slug}`}>Shopping Cart</Link></li>
          </ul>
        </div>

        <div>
          <h4 style={{ color: 'var(--text-primary)', marginBottom: '12px', fontSize: '15px' }}>Merchant Administration</h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li><Link href={`/admin/dashboard?tenant=${tenant?.slug}`}>Store Dashboard</Link></li>
            <li><Link href={`/admin/products?tenant=${tenant?.slug}`}>Inventory & Products</Link></li>
            <li><Link href={`/admin/themes?tenant=${tenant?.slug}`}>Theme Customizer</Link></li>
            <li><Link href="/onboarding">Launch New Store</Link></li>
          </ul>
        </div>

        <div>
          <h4 style={{ color: 'var(--text-primary)', marginBottom: '12px', fontSize: '15px' }}>Active Theme Engine</h4>
          <div className="glass-panel" style={{ padding: '12px', fontSize: '12px' }}>
            <p style={{ color: 'var(--theme-accent)', fontWeight: '600', marginBottom: '4px' }}>
              Theme: {tenant?.theme?.id?.toUpperCase() || 'FASHION'}
            </p>
            <p>Font: {tenant?.theme?.settings?.fontFamily || 'Inter'}</p>
            <p>Accent: <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--theme-primary)', marginRight: '4px' }}></span>{tenant?.theme?.settings?.primaryColor}</p>
          </div>
        </div>
      </div>

      <div className="container" style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '40px', paddingTop: '24px', textAlign: 'center', fontSize: '12px' }}>
        © {new Date().getFullYear()} {tenant?.name || 'DTabs Commerce'}. All rights reserved. Production-grade multi-tenant SaaS architecture.
      </div>
    </footer>
  );
}
