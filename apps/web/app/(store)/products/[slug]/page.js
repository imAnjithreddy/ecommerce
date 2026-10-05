import { getResolvedTenant } from '../../../../lib/tenant/resolver';
import ProductDetailView from '../../../../components/product/ProductDetailView';
import { notFound } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

async function getProduct(slug, tenantSlug) {
  try {
    const res = await fetch(`${API_BASE}/storefront/products/${slug}`, {
      headers: { 'x-tenant-slug': tenantSlug },
      next: { revalidate: 10 }
    });

    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch (err) {
    return null;
  }
}

export async function generateMetadata({ params, searchParams }) {
  const tenant = await getResolvedTenant(searchParams);
  const data = await getProduct(params.slug, tenant.slug);

  if (!data || !data.product) {
    return { title: 'Product Not Found' };
  }

  const { product } = data;
  return {
    title: `${product.name} | ${tenant.settings?.storeName || tenant.name}`,
    description: product.description?.substring(0, 160) || `Buy ${product.name} online.`,
    openGraph: {
      title: product.name,
      description: product.description?.substring(0, 160),
      images: product.images?.[0]?.url ? [{ url: product.images[0].url }] : []
    }
  };
}

export default async function ProductDetailPage({ params, searchParams }) {
  const tenant = await getResolvedTenant(searchParams);
  const data = await getProduct(params.slug, tenant.slug);

  if (!data || !data.product) {
    notFound();
  }

  return (
    <div className="container" style={{ padding: '48px 24px' }}>
      <ProductDetailView
        product={data.product}
        inventory={data.inventory || {}}
        reviews={data.reviews || []}
        tenant={tenant}
      />
    </div>
  );
}
