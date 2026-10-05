'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export default function NewProductPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenantSlug = searchParams.get('tenant') || 'aurora';
  const tenantParam = `?tenant=${tenantSlug}`;

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [compareAtPrice, setCompareAtPrice] = useState('');
  const [sku, setSku] = useState('');
  const [initialStock, setInitialStock] = useState('20');
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('dtabs_token');
      const res = await fetch(`${API_BASE}/admin/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name,
          description,
          price: Number(price),
          compareAtPrice: compareAtPrice ? Number(compareAtPrice) : null,
          sku,
          initialStock: Number(initialStock),
          images: imageUrl ? [{ url: imageUrl, isDefault: true }] : [],
          status: 'active'
        })
      });

      const data = await res.json();
      if (res.ok) {
        router.push(`/admin/products${tenantParam}`);
      } else {
        alert(data.error?.message || 'Failed to create product');
      }
    } catch (err) {
      alert('Network error submitting product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '720px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link href={`/admin/products${tenantParam}`} style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          &larr; Back to Products
        </Link>
        <h1 style={{ fontSize: '28px', fontWeight: '800', marginTop: '8px' }}>Create New Product</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Add an item to the catalog for store {tenantSlug}</p>
      </div>

      <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '32px' }}>
        <div className="form-group">
          <label className="form-label">Product Name *</label>
          <input
            type="text"
            required
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Classic Aviator Sunglasses"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea
            rows="4"
            className="form-textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe features, materials, and warranty..."
          ></textarea>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Base Price ($) *</label>
            <input
              type="number"
              step="0.01"
              required
              className="form-input"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="120.00"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Compare-at Price ($)</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              value={compareAtPrice}
              onChange={(e) => setCompareAtPrice(e.target.value)}
              placeholder="150.00"
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Base SKU *</label>
            <input
              type="text"
              required
              className="form-input"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="e.g. SUN-GLS-001"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Initial Inventory Quantity</label>
            <input
              type="number"
              required
              className="form-input"
              value={initialStock}
              onChange={(e) => setInitialStock(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Image URL</label>
          <input
            type="url"
            className="form-input"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary"
          style={{ width: '100%', marginTop: '16px', padding: '12px' }}
        >
          {loading ? 'Creating Product...' : 'Publish Product to Store'}
        </button>
      </form>
    </div>
  );
}
