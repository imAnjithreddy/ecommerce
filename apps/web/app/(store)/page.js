import ProductCard from '../../components/product/ProductCard';
import { getResolvedTenant } from '../../lib/tenant/resolver';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

async function getStorefrontData(tenantSlug) {
  try {
    const headers = { 'x-tenant-slug': tenantSlug };
    const [prodRes, catRes] = await Promise.all([
      fetch(`${API_BASE}/storefront/products?limit=8&featured=true`, { headers, next: { revalidate: 30 } }),
      fetch(`${API_BASE}/storefront/categories`, { headers, next: { revalidate: 60 } })
    ]);

    const prods = prodRes.ok ? (await prodRes.json()).data : [];
    const cats = catRes.ok ? (await catRes.json()).data : [];

    return { products: prods, categories: cats };
  } catch (err) {
    return { products: [], categories: [] };
  }
}

export default async function HomePage({ searchParams }) {
  const tenant = await getResolvedTenant(searchParams);
  const { products, categories } = await getStorefrontData(tenant.slug);
  const tenantParam = tenant.slug ? `?tenant=${tenant.slug}` : '';

  const themeId = tenant?.theme?.id || 'fashion';
  const bannerText = tenant?.theme?.settings?.bannerText || `Welcome to ${tenant.name}`;

  return (
    <div>
      {/* Dynamic Themed Hero Section */}
      <section style={{
        position: 'relative',
        padding: '90px 0 80px 0',
        overflow: 'hidden',
        background: themeId === 'fashion'
          ? 'radial-gradient(circle at top right, rgba(136, 19, 55, 0.45), transparent 70%), #0b0f19'
          : themeId === 'electronics'
          ? 'radial-gradient(circle at top right, rgba(14, 165, 233, 0.35), transparent 60%), #090d16'
          : 'linear-gradient(180deg, #111827 0%, #0b0f19 100%)',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <div className="container" style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '800px' }}>
          <span className="badge badge-primary" style={{ marginBottom: '16px' }}>
            {tenant.settings?.storeName || tenant.name}
          </span>

          <h1 style={{
            fontSize: '48px',
            fontWeight: '800',
            lineHeight: '1.15',
            letterSpacing: '-0.03em',
            marginBottom: '20px',
            background: 'linear-gradient(180deg, #ffffff 0%, #cbd5e1 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            {bannerText}
          </h1>

          <p style={{ fontSize: '18px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '32px' }}>
            Discover our curated lineup with instant delivery, verified customer reviews, and dedicated customer support.
          </p>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <Link href={`/products${tenantParam}`} className="btn btn-primary" style={{ padding: '12px 28px', fontSize: '15px' }}>
              Explore Collection
            </Link>
            <Link href={`/admin/dashboard${tenantParam}`} className="btn btn-secondary" style={{ padding: '12px 24px', fontSize: '15px' }}>
              Store Management
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section style={{ padding: '64px 0' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '32px' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--theme-accent)', letterSpacing: '0.05em' }}>
                Handpicked
              </span>
              <h2 style={{ fontSize: '28px', fontWeight: '700', letterSpacing: '-0.02em', marginTop: '4px' }}>
                Featured Products
              </h2>
            </div>
            <Link href={`/products${tenantParam}`} style={{ fontSize: '14px', fontWeight: '600', color: 'var(--theme-accent)' }}>
              View All Products &rarr;
            </Link>
          </div>

          {products && products.length > 0 ? (
            <div className="grid-products">
              {products.map(product => (
                <ProductCard
                  key={product._id}
                  product={product}
                  tenantSlug={tenant.slug}
                  currency={tenant.settings?.currency || 'USD'}
                />
              ))}
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '48px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)' }}>No featured products currently available.</p>
              <Link href={`/products${tenantParam}`} className="btn btn-primary" style={{ marginTop: '16px' }}>
                Browse Full Catalog
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Value Proposition Highlights */}
      <section style={{ padding: '48px 0', background: 'rgba(17, 24, 39, 0.4)', borderTop: '1px solid var(--border-subtle)' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>🔒</div>
            <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>Strict Tenant Isolation</h4>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Every customer profile, order history, and product catalog is cryptographically and logically isolated.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>⚡</div>
            <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>Real-Time Inventory</h4>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Atomic check-and-decrement stock management prevents overselling even during flash sales.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>🎨</div>
            <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>Configurable Themes</h4>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Dynamic typography, palettes, and layouts customized independently by each store merchant.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
