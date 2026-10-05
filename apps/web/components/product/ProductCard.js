import Link from 'next/link';
import { formatCurrency } from '@dtabs/shared';

export default function ProductCard({ product, tenantSlug, currency = 'USD' }) {
  const imageUrl = product.images?.[0]?.url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80';
  const tenantParam = tenantSlug ? `?tenant=${tenantSlug}` : '';

  return (
    <div className="product-card">
      <Link href={`/products/${product.slug}${tenantParam}`} className="product-image-wrap">
        <img
          src={imageUrl}
          alt={product.name}
          loading="lazy"
        />
        {product.compareAtPrice && product.compareAtPrice > product.price && (
          <span className="badge badge-primary" style={{ position: 'absolute', top: '12px', right: '12px' }}>
            Sale
          </span>
        )}
      </Link>

      <div className="product-info">
        {product.categories?.[0] && (
          <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '4px' }}>
            {product.categories[0].name}
          </span>
        )}

        <Link href={`/products/${product.slug}${tenantParam}`}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px', lineHeight: '1.4' }}>
            {product.name}
          </h3>
        </Link>

        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
              {formatCurrency(product.price, currency)}
            </span>
            {product.compareAtPrice && (
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                {formatCurrency(product.compareAtPrice, currency)}
              </span>
            )}
          </div>

          <Link href={`/products/${product.slug}${tenantParam}`} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
}
