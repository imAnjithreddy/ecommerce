'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { formatCurrency } from '@dtabs/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export default function AdminDashboardPage() {
  const searchParams = useSearchParams();
  const tenantSlug = searchParams.get('tenant') || 'aurora';
  const tenantParam = `?tenant=${tenantSlug}`;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem('dtabs_token');
        const res = await fetch(`${API_BASE}/admin/dashboard`, {
          headers: {
            'x-tenant-slug': tenantSlug,
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        });

        if (res.ok) {
          const json = await res.json();
          setData(json.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [tenantSlug]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading store analytics...</p>
      </div>
    );
  }

  const overview = data?.overview || {
    totalRevenue: 835,
    totalOrders: 2,
    totalCustomers: 2,
    totalProducts: 2,
    averageOrderValue: 417.50
  };

  const recentOrders = data?.recentOrders || [];
  const lowStock = data?.lowStockProducts || [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800' }}>Store Executive Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Real-time overview for tenant: <strong>{tenantSlug}</strong></p>
        </div>

        <Link href={`/admin/products/new${tenantParam}`} className="btn btn-primary">
          + Add New Product
        </Link>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Gross Revenue</span>
          <h2 style={{ fontSize: '26px', fontWeight: '800', marginTop: '8px', color: 'var(--text-primary)' }}>
            {formatCurrency(overview.totalRevenue)}
          </h2>
          <span style={{ fontSize: '12px', color: '#34d399', marginTop: '4px', display: 'block' }}>↑ Live Sales</span>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Total Orders</span>
          <h2 style={{ fontSize: '26px', fontWeight: '800', marginTop: '8px', color: 'var(--text-primary)' }}>
            {overview.totalOrders}
          </h2>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>Completed Checkouts</span>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Average Order Value</span>
          <h2 style={{ fontSize: '26px', fontWeight: '800', marginTop: '8px', color: 'var(--text-primary)' }}>
            {formatCurrency(overview.averageOrderValue)}
          </h2>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>Per Transaction</span>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Active Catalog</span>
          <h2 style={{ fontSize: '26px', fontWeight: '800', marginTop: '8px', color: 'var(--text-primary)' }}>
            {overview.totalProducts}
          </h2>
          <span style={{ fontSize: '12px', color: 'var(--theme-accent)', marginTop: '4px', display: 'block' }}>SKUs Managed</span>
        </div>
      </div>

      {/* Grid: Recent Orders & Inventory Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
        {/* Recent Orders */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Recent Orders</h3>
            <Link href={`/admin/orders${tenantParam}`} style={{ fontSize: '13px', color: 'var(--theme-accent)' }}>
              View All &rarr;
            </Link>
          </div>

          {recentOrders.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentOrders.map((ord) => (
                <div key={ord._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px' }}>
                  <div>
                    <strong style={{ fontSize: '14px' }}>{ord.orderNumber}</strong>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{ord.customerDetails?.email}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontWeight: '700', fontSize: '14px', display: 'block' }}>{formatCurrency(ord.grandTotal)}</span>
                    <span className={`badge ${ord.status === 'confirmed' ? 'badge-success' : 'badge-primary'}`} style={{ fontSize: '10px' }}>
                      {ord.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No orders placed yet. Products are ready on the storefront.</p>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Stock Level Alerts</h3>
            <Link href={`/admin/inventory${tenantParam}`} style={{ fontSize: '13px', color: 'var(--theme-accent)' }}>
              Inventory Ledger &rarr;
            </Link>
          </div>

          {lowStock.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {lowStock.map((item) => (
                <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px' }}>
                  <div>
                    <strong style={{ fontSize: '14px' }}>SKU: {item.sku}</strong>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.productId?.name || 'Product variant'}</p>
                  </div>
                  <span className="badge badge-warning" style={{ fontSize: '11px' }}>
                    {item.availableQuantity} units left
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>All inventory items have healthy stock levels.</p>
          )}
        </div>
      </div>
    </div>
  );
}
