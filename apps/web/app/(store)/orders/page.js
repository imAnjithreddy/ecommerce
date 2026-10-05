'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export default function StoreOrdersPage() {
  const searchParams = useSearchParams();
  const tenantSlug = searchParams.get('tenant') || 'aurora';

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem('dtabs_token');
        if (!token) {
           setLoading(false);
           return;
        }

        const res = await fetch(`${API_BASE}/orders/my-orders`, {
          headers: {
            'x-tenant-slug': tenantSlug,
            'Authorization': `Bearer ${token}`
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
    fetchOrders();
  }, [tenantSlug]);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading your orders...</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '24px' }}>My Orders</h1>

      {orders.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', background: 'var(--surface-color)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>You haven't placed any orders yet.</p>
          <Link href={`/?tenant=${tenantSlug}`} className="btn btn-primary">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {orders.map(order => (
            <div key={order._id} style={{ padding: '24px', background: 'var(--surface-color)', borderRadius: '8px', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Order #{order.orderNumber}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                    {new Date(order.createdAt).toLocaleDateString()} &middot; {order.items.length} items
                  </p>
               </div>
               <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>${order.grandTotal.toFixed(2)}</div>
                  <span style={{
                    padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '600',
                    background: order.status === 'confirmed' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.1)',
                    color: order.status === 'confirmed' ? '#4ade80' : 'inherit'
                  }}>
                    {order.status.toUpperCase()}
                  </span>
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
