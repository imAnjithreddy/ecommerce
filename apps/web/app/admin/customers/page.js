'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { formatCurrency } from '@dtabs/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export default function AdminCustomersPage() {
  const searchParams = useSearchParams();
  const tenantSlug = searchParams.get('tenant') || 'aurora';

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const token = localStorage.getItem('dtabs_token');
        const res = await fetch(`${API_BASE}/admin/customers`, {
          headers: {
            'x-tenant-slug': tenantSlug,
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        });

        if (res.ok) {
          const json = await res.json();
          setCustomers(json.data || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, [tenantSlug]);

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800' }}>Store Customers</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Isolated customer records and total lifetime spending for {tenantSlug}</p>
      </div>

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid var(--border-subtle)' }}>
              <th style={{ padding: '14px 20px', fontWeight: '600' }}>Customer</th>
              <th style={{ padding: '14px 20px', fontWeight: '600' }}>Email</th>
              <th style={{ padding: '14px 20px', fontWeight: '600' }}>Total Orders</th>
              <th style={{ padding: '14px 20px', fontWeight: '600' }}>Lifetime Value</th>
              <th style={{ padding: '14px 20px', fontWeight: '600' }}>Registered</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Loading customers...
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No customer profiles registered in this store yet. Checkouts automatically record customers here.
                </td>
              </tr>
            ) : (
              customers.map((cust) => (
                <tr key={cust._id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '14px 20px', fontWeight: '600' }}>
                    {cust.firstName} {cust.lastName}
                  </td>
                  <td style={{ padding: '14px 20px', color: 'var(--text-secondary)' }}>
                    {cust.email}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    {cust.totalOrdersCount || 0} orders
                  </td>
                  <td style={{ padding: '14px 20px', fontWeight: '700', color: 'var(--theme-accent)' }}>
                    {formatCurrency(cust.totalSpent || 0)}
                  </td>
                  <td style={{ padding: '14px 20px', color: 'var(--text-muted)' }}>
                    {new Date(cust.createdAt).toLocaleDateString()}
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
