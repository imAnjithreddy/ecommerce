import ProductCard from '../../../components/product/ProductCard';
import { getResolvedTenant } from '../../../lib/tenant/resolver';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

async function fetchProducts(tenantSlug, query = {}) {
  try {
    const params = new URLSearchParams();
    if (query.category) params.set('category', query.category);
    if (query.search) params.set('search', query.search);
    if (query.sort) params.set('sort', query.sort);

    const res = await fetch(`${API_BASE}/storefront/products?${params.toString()}`, {
      headers: { 'x-tenant-slug': tenantSlug },
      next: { revalidate: 15 }
    });

    if (!res.ok) return { products: [], categories: [] };
    const data = await res.json();

    const catRes = await fetch(`${API_BASE}/storefront/categories`, {
      headers: { 'x-tenant-slug': tenantSlug },
      next: { revalidate: 60 }
    });
    const catData = catRes.ok ? await catRes.json() : { data: [] };

    return {
      products: data.data || [],
      pagination: data.pagination,
      categories: catData.data || []
    };
  } catch (err) {
    return { products: [], categories: [] };
  }
}

export default async function ProductsCatalogPage({ searchParams }) {
  const tenant = await getResolvedTenant(searchParams);
  const { products, categories } = await fetchProducts(tenant.slug, searchParams);
  const tenantParam = tenant.slug ? `&tenant=${tenant.slug}` : '';

  return (
    <div className="container" style={{ padding: '40px 24px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '8px' }}>Store Catalog</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Browse all products from {tenant.settings?.storeName || tenant.name}
        </p>
      </div>

      {/* Category Pills Filter */}
      {categories.length > 0 && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '32px' }}>
          <Link
            href={`/products?tenant=${tenant.slug}`}
            className={`btn ${!searchParams.category ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 14px', fontSize: '13px' }}
          >
            All Items
          </Link>
          {categories.map(cat => (
            <Link
              key={cat._id}
              href={`/products?category=${cat.slug}${tenantParam}`}
              className={`btn ${searchParams.category === cat.slug ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 14px', fontSize: '13px' }}
            >
              {cat.name}
            </Link>
          ))}
        </div>
      )}

      {/* Product Grid */}
      {products.length > 0 ? (
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
        <div className="glass-panel" style={{ padding: '64px 24px', textAlign: 'center' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>No products found</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Try adjusting your search criteria or filters.</p>
          <Link href={`/products?tenant=${tenant.slug}`} className="btn btn-primary">
            Clear Filters
          </Link>
        </div>
      )}
    </div>
  );
}
