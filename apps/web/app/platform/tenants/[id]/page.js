'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export default function PlatformTenantDetailPage({ params }) {
  const router = useRouter();
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchTenant = async () => {
      try {
        const token = localStorage.getItem('dtabs_token');
        // We'll simulate fetching a specific tenant by filtering the list for now
        // A real implementation would have a GET /platform/tenants/:id endpoint
        const res = await fetch(`${API_BASE}/platform/tenants`, {
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        });

        if (res.ok) {
          const json = await res.json();
          const found = json.data.find(t => t._id === params.id);
          setTenant(found);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTenant();
  }, [params.id]);

  const handleStatusChange = async (newStatus) => {
    if (!confirm(`Are you sure you want to change the status to ${newStatus}?`)) return;
    setUpdating(true);
    try {
      const token = localStorage.getItem('dtabs_token');
      const res = await fetch(`${API_BASE}/platform/tenants/${params.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setTenant({ ...tenant, status: newStatus });
      } else {
        alert('Failed to update status');
      }
    } catch (err) {
      alert('Error updating status');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div style={{ padding: '40px', color: 'var(--text-secondary)' }}>Loading tenant details...</div>;
  if (!tenant) return <div style={{ padding: '40px', color: 'var(--text-secondary)' }}>Tenant not found</div>;

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '8px', fontSize: '14px' }}>
            &larr; Back to Tenants
          </button>
          <h1 style={{ fontSize: '28px', fontWeight: '800' }}>{tenant.name}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Tenant ID: {tenant._id}</p>
        </div>
        <div>
           <span style={{
              padding: '6px 12px', borderRadius: '16px', fontSize: '14px', fontWeight: '600',
              background: tenant.status === 'active' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: tenant.status === 'active' ? '#4ade80' : '#f87171'
            }}>
              {tenant.status.toUpperCase()}
            </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Store Information</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Slug</span>
              <span style={{ fontFamily: 'monospace' }}>{tenant.slug}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Plan</span>
              <span style={{ fontWeight: '600' }}>{tenant.plan}</span>
            </div>
             <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Created At</span>
              <span>{new Date(tenant.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Platform Actions</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
            Use these controls to manage the tenant's access to the platform.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            {tenant.status === 'active' ? (
              <button
                onClick={() => handleStatusChange('suspended')}
                disabled={updating}
                className="btn btn-secondary"
                style={{ borderColor: '#ef4444', color: '#ef4444' }}
              >
                {updating ? 'Suspending...' : 'Suspend Store'}
              </button>
            ) : (
              <button
                onClick={() => handleStatusChange('active')}
                disabled={updating}
                className="btn btn-primary"
              >
                 {updating ? 'Activating...' : 'Reactivate Store'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
