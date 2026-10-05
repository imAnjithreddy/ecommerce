'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { formatCurrency } from '@dtabs/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export default function AdminOrdersPage() {
  const searchParams = useSearchParams();
  const tenantSlug = searchParams.get('tenant') || 'aurora';

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('dtabs_token');
      const res = await fetch(`${API_BASE}/admin/orders`, {
        headers: {
          'x-tenant-slug': tenantSlug,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      if (res.ok) {
        const json = await res.json();
        setOrders(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [tenantSlug]);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem('dtabs_token');
      const res = await fetch(`${API_BASE}/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        fetchOrders();
      } else {
        const data = await res.json();
        alert(data.error?.message || 'Invalid transition');
      }
    } catch (err) {
      alert('Error updating status');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800' }}>Orders & Fulfillment</h1>
        <p style={{ color: 'var(--text-secondary)' }}>View frozen snapshot orders and progress order lifecycle states</p>
      </div>

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid var(--border-subtle)' }}>
              <th style={{ padding: '14px 20px', fontWeight: '600' }}>Order #</th>
              <th style={{ padding: '14px 20px', fontWeight: '600' }}>Customer</th>
              <th style={{ padding: '14px 20px', fontWeight: '600' }}>Items Frozen</th>
              <th style={{ padding: '14px 20px', fontWeight: '600' }}>Total</th>
              <th style={{ padding: '14px 20px', fontWeight: '600' }}>Payment</th>
              <th style={{ padding: '14px 20px', fontWeight: '600' }}>Lifecycle State</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Loading orders...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No customer orders received yet. Checkouts on the storefront will appear here.
                </td>
              </tr>
            ) : (
              orders.map((ord) => (
                <tr key={ord._id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '14px 20px', fontWeight: '700', fontFamily: 'monospace' }}>
                    {ord.orderNumber}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <div>{ord.customerDetails?.firstName} {ord.customerDetails?.lastName}</div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{ord.customerDetails?.email}</span>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    {ord.items?.map((item, idx) => (
                      <div key={idx} style={{ fontSize: '13px' }}>
                        {item.quantity}x {item.name} ({formatCurrency(item.price)})
                      </div>
                    ))}
                  </td>
                  <td style={{ padding: '14px 20px', fontWeight: '700' }}>
                    {formatCurrency(ord.grandTotal)}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span className={`badge ${ord.paymentStatus === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                      {ord.paymentStatus}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <select
                      className="form-select"
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                      value={ord.status}
                      onChange={(e) => handleStatusChange(ord._id, e.target.value)}
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
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
