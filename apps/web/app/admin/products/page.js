'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { formatCurrency } from '@dtabs/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export default function AdminProductsPage() {
  const searchParams = useSearchParams();
  const tenantSlug = searchParams.get('tenant') || 'aurora';
  const tenantParam = `?tenant=${tenantSlug}`;

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('dtabs_token');
      const res = await fetch(`${API_BASE}/admin/products`, {
        headers: {
          'x-tenant-slug': tenantSlug,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      if (res.ok) {
        const json = await res.json();
        setProducts(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [tenantSlug]);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to archive/delete this product?')) return;
    try {
      const token = localStorage.getItem('dtabs_token');
      const res = await fetch(`${API_BASE}/admin/products/${id}`, {
        method: 'DELETE',
        headers: {
          'x-tenant-slug': tenantSlug,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      if (res.ok) {
        setProducts(products.filter(p => p._id !== id));
      }
    } catch (err) {
      alert('Error deleting product');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800' }}>Products & Catalog</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage SKUs, prices, variants, and stock for {tenantSlug}</p>
        </div>

        <Link href={`/admin/products/new${tenantParam}`} className="btn btn-primary">
          + Add Product
        </Link>
      </div>

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid var(--border-subtle)' }}>
              <th style={{ padding: '14px 20px', fontWeight: '600' }}>Product</th>
              <th style={{ padding: '14px 20px', fontWeight: '600' }}>SKU</th>
              <th style={{ padding: '14px 20px', fontWeight: '600' }}>Price</th>
              <th style={{ padding: '14px 20px', fontWeight: '600' }}>Variants</th>
              <th style={{ padding: '14px 20px', fontWeight: '600' }}>Status</th>
              <th style={{ padding: '14px 20px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Loading catalog...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No products found. Click "+ Add Product" to create your first catalog item.
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product._id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img
                      src={product.images?.[0]?.url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30'}
                      alt=""
                      style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }}
                    />
                    <div>
                      <strong style={{ display: 'block' }}>{product.name}</strong>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{product.slug}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px', fontFamily: 'monospace' }}>{product.sku}</td>
                  <td style={{ padding: '14px 20px', fontWeight: '600' }}>{formatCurrency(product.price)}</td>
                  <td style={{ padding: '14px 20px' }}>{product.variants?.length || 0} variants</td>
                  <td style={{ padding: '14px 20px' }}>
                    <span className={`badge ${product.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                      {product.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleDelete(product._id)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '13px' }}
                    >
                      Archive
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
