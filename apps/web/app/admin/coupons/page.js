'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export default function AdminCouponsPage() {
  const searchParams = useSearchParams();
  const tenantSlug = searchParams.get('tenant') || 'aurora';

  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [type, setType] = useState('percentage');
  const [value, setValue] = useState('');
  const [minimumOrderValue, setMinimumOrderValue] = useState('0');
  const [creating, setCreating] = useState(false);

  const fetchCoupons = async () => {
    try {
      const token = localStorage.getItem('dtabs_token');
      const res = await fetch(`${API_BASE}/admin/coupons`, {
        headers: {
          'x-tenant-slug': tenantSlug,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      if (res.ok) {
        const json = await res.json();
        setCoupons(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, [tenantSlug]);

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    setCreating(true);

    try {
      const token = localStorage.getItem('dtabs_token');
      const res = await fetch(`${API_BASE}/admin/coupons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          code: code.toUpperCase(),
          type,
          value: Number(value),
          minimumOrderValue: Number(minimumOrderValue)
        })
      });

      if (res.ok) {
        setCode('');
        setValue('');
        setMinimumOrderValue('0');
        fetchCoupons();
      } else {
        const err = await res.json();
        alert(err.error?.message || 'Failed to create coupon');
      }
    } catch (err) {
      alert('Error creating coupon');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    try {
      const token = localStorage.getItem('dtabs_token');
      const res = await fetch(`${API_BASE}/admin/coupons/${id}`, {
        method: 'DELETE',
        headers: {
          'x-tenant-slug': tenantSlug,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      if (res.ok) {
        setCoupons(coupons.filter(c => c._id !== id));
      }
    } catch (err) {
      alert('Error deleting coupon');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800' }}>Discount Coupons</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage promotional discount codes and order minimums for {tenantSlug}</p>
      </div>

      {/* Create Coupon Card */}
      <form onSubmit={handleCreateCoupon} className="glass-panel" style={{ padding: '24px', marginBottom: '32px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>Generate New Promotional Coupon</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Coupon Code</label>
            <input
              type="text"
              required
              className="form-input"
              style={{ textTransform: 'uppercase' }}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. SUMMER20"
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Discount Type</label>
            <select className="form-select" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Dollar ($)</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Discount Value</label>
            <input
              type="number"
              required
              min="1"
              className="form-input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={type === 'percentage' ? '15' : '25'}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Min. Order Value ($)</label>
            <input
              type="number"
              min="0"
              className="form-input"
              value={minimumOrderValue}
              onChange={(e) => setMinimumOrderValue(e.target.value)}
            />
          </div>

          <button type="submit" disabled={creating} className="btn btn-primary" style={{ height: '42px' }}>
            {creating ? 'Creating...' : '+ Add Coupon'}
          </button>
        </div>
      </form>

      {/* Coupons Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid var(--border-subtle)' }}>
              <th style={{ padding: '14px 20px', fontWeight: '600' }}>Code</th>
              <th style={{ padding: '14px 20px', fontWeight: '600' }}>Discount</th>
              <th style={{ padding: '14px 20px', fontWeight: '600' }}>Min Order</th>
              <th style={{ padding: '14px 20px', fontWeight: '600' }}>Redemptions</th>
              <th style={{ padding: '14px 20px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Loading coupons...
                </td>
              </tr>
            ) : coupons.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No coupons configured for this store yet.
                </td>
              </tr>
            ) : (
              coupons.map((c) => (
                <tr key={c._id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '14px 20px', fontFamily: 'monospace', fontWeight: '700' }}>
                    {c.code}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    {c.type === 'percentage' ? `${c.value}% OFF` : `$${c.value} FLAT OFF`}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    ${c.minimumOrderValue || 0}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    {c.usedCount || 0} times
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleDelete(c._id)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '13px' }}
                    >
                      Delete
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
