'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export default function AdminInventoryPage() {
  const searchParams = useSearchParams();
  const tenantSlug = searchParams.get('tenant') || 'aurora';

  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSku, setSelectedSku] = useState(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const fetchInventory = async () => {
    try {
      const token = localStorage.getItem('dtabs_token');
      const res = await fetch(`${API_BASE}/admin/inventory`, {
        headers: {
          'x-tenant-slug': tenantSlug,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      if (res.ok) {
        const json = await res.json();
        setInventory(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [tenantSlug]);

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSku || !adjustQty) return;

    setAdjusting(true);
    try {
      const token = localStorage.getItem('dtabs_token');
      const res = await fetch(`${API_BASE}/admin/inventory/adjust`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          sku: selectedSku,
          quantity: Number(adjustQty),
          note: adjustNote || 'Manual admin inventory adjustment'
        })
      });

      if (res.ok) {
        setSelectedSku(null);
        setAdjustQty('');
        setAdjustNote('');
        fetchInventory();
      } else {
        const err = await res.json();
        alert(err.error?.message || 'Failed to adjust inventory');
      }
    } catch (err) {
      alert('Error adjusting stock');
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800' }}>Inventory & Stock Ledger</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Track real-time available and sold quantities with auditable stock movements</p>
      </div>

      {selectedSku && (
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', border: '1px solid var(--theme-accent)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>
            Adjust Stock Level for SKU: <span style={{ color: 'var(--theme-accent)' }}>{selectedSku}</span>
          </h3>
          <form onSubmit={handleAdjustSubmit} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Quantity Change (+ to restock, - to reduce)</label>
              <input
                type="number"
                required
                className="form-input"
                style={{ width: '160px' }}
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                placeholder="+25 or -5"
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0, flexGrow: 1 }}>
              <label className="form-label">Adjustment Reason / Note</label>
              <input
                type="text"
                className="form-input"
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                placeholder="e.g. Warehouse shipment restock batch #440"
              />
            </div>

            <button type="submit" disabled={adjusting} className="btn btn-primary" style={{ height: '42px' }}>
              {adjusting ? 'Saving...' : 'Apply Stock Change'}
            </button>
            <button type="button" onClick={() => setSelectedSku(null)} className="btn btn-secondary" style={{ height: '42px' }}>
              Cancel
            </button>
          </form>
        </div>
      )}

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid var(--border-subtle)' }}>
              <th style={{ padding: '14px 20px', fontWeight: '600' }}>SKU</th>
              <th style={{ padding: '14px 20px', fontWeight: '600' }}>Product</th>
              <th style={{ padding: '14px 20px', fontWeight: '600' }}>Available Units</th>
              <th style={{ padding: '14px 20px', fontWeight: '600' }}>Units Sold</th>
              <th style={{ padding: '14px 20px', fontWeight: '600' }}>Threshold</th>
              <th style={{ padding: '14px 20px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Loading stock levels...
                </td>
              </tr>
            ) : inventory.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No inventory tracked yet.
                </td>
              </tr>
            ) : (
              inventory.map((item) => (
                <tr key={item._id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '14px 20px', fontFamily: 'monospace', fontWeight: '700' }}>
                    {item.sku}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    {item.productId?.name || 'Item'}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span className={`badge ${item.availableQuantity <= item.lowStockThreshold ? 'badge-warning' : 'badge-success'}`}>
                      {item.availableQuantity} available
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    {item.soldQuantity || 0}
                  </td>
                  <td style={{ padding: '14px 20px', color: 'var(--text-muted)' }}>
                    &le; {item.lowStockThreshold}
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    <button
                      onClick={() => { setSelectedSku(item.sku); setAdjustQty(''); }}
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                    >
                      Adjust Stock
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
