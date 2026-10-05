'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatCurrency, SAAS_PLANS, PLAN_LIMITS } from '@dtabs/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export default function PlatformDashboardPage() {
  const [stats, setStats] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  // Platform Onboarding Modal State
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [slug, setSlug] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerFirstName, setOwnerFirstName] = useState('');
  const [ownerLastName, setOwnerLastName] = useState('');
  const [plan, setPlan] = useState(SAAS_PLANS.STARTER);
  const [themeId, setThemeId] = useState('fashion');
  const [currency, setCurrency] = useState('USD');
  const [provisioning, setProvisioning] = useState(false);
  const [onboardSuccess, setOnboardSuccess] = useState(null);
  const [onboardError, setOnboardError] = useState('');

  const fetchPlatformData = async () => {
    try {
      let token = localStorage.getItem('dtabs_token');
      if (!token) {
        const authRes = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'admin@dtabs.tech', password: 'admin12345' })
        });
        if (authRes.ok) {
          const authJson = await authRes.json();
          token = authJson.data.token;
          localStorage.setItem('dtabs_token', token);
        }
      }

      const [statsRes, tenantsRes] = await Promise.all([
        fetch(`${API_BASE}/platform/stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/platform/tenants`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (statsRes.ok) {
        const sJson = await statsRes.json();
        setStats(sJson.data);
      }
      if (tenantsRes.ok) {
        const tJson = await tenantsRes.json();
        setTenants(tJson.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlatformData();
  }, []);

  const handleNameChange = (val) => {
    setStoreName(val);
    const autoSlug = val.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    setSlug(autoSlug);
  };

  const handleOnboardSubmit = async (e) => {
    e.preventDefault();
    setProvisioning(true);
    setOnboardError('');
    setOnboardSuccess(null);

    try {
      const token = localStorage.getItem('dtabs_token');
      const res = await fetch(`${API_BASE}/platform/tenants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: storeName,
          slug,
          ownerEmail,
          ownerFirstName,
          ownerLastName,
          plan,
          themeId,
          currency
        })
      });

      const data = await res.json();
      if (res.ok) {
        setOnboardSuccess(data.data);
        fetchPlatformData();
      } else {
        setOnboardError(data.error?.message || 'Failed to onboard tenant store');
      }
    } catch (err) {
      setOnboardError('Network error communicating with platform API');
    } finally {
      setProvisioning(false);
    }
  };

  const resetOnboardForm = () => {
    setStoreName('');
    setSlug('');
    setOwnerEmail('');
    setOwnerFirstName('');
    setOwnerLastName('');
    setOnboardSuccess(null);
    setOnboardError('');
    setShowOnboardModal(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800' }}>Platform Super-Administration</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Global SaaS monitoring, tenant directory, and tenant shop provisioning</p>
        </div>

        <button
          onClick={() => setShowOnboardModal(true)}
          className="btn btn-primary"
          style={{ padding: '10px 20px', fontSize: '14px', background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)' }}
        >
          + Onboard New Shop
        </button>
      </div>

      {/* Onboard Modal */}
      {showOnboardModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '24px'
        }}>
          <div className="glass-panel" style={{ maxWidth: '640px', width: '100%', padding: '36px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: '800' }}>Onboard New Merchant Shop</h2>
              <button
                onClick={resetOnboardForm}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '24px', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            {onboardSuccess ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
                <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Store Successfully Provisioned!</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                  The tenant isolation container, subdomain routing, and store owner permissions are live.
                </p>

                <div style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', padding: '16px', textAlign: 'left', marginBottom: '24px', fontSize: '13px' }}>
                  <div style={{ marginBottom: '8px' }}><strong>Store:</strong> {onboardSuccess.tenant.name}</div>
                  <div style={{ marginBottom: '8px' }}><strong>Subdomain:</strong> <code>{onboardSuccess.tenant.slug}.dtabs.tech</code></div>
                  <div style={{ marginBottom: '8px' }}><strong>Plan:</strong> <span className="badge badge-primary">{onboardSuccess.tenant.plan?.toUpperCase()}</span></div>
                  <div style={{ marginBottom: '8px' }}><strong>Owner Email:</strong> {onboardSuccess.owner?.email}</div>
                  {onboardSuccess.owner?.temporaryPassword && (
                    <div style={{ color: '#fbbf24' }}>
                      <strong>Temporary Password:</strong> <code>{onboardSuccess.owner.temporaryPassword}</code>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <a href={onboardSuccess.adminUrl} target="_blank" className="btn btn-primary" rel="noreferrer">
                    Open Store Admin &rarr;
                  </a>
                  <button onClick={resetOnboardForm} className="btn btn-secondary">
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleOnboardSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {onboardError && (
                  <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#f87171', fontSize: '13px' }}>
                    {onboardError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Shop / Brand Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={storeName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Zenith Optics"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Subdomain Slug *</label>
                  <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(17, 24, 39, 0.8)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--theme-radius)', padding: '0 12px' }}>
                    <input
                      type="text"
                      required
                      className="form-input"
                      style={{ border: 'none', background: 'transparent', paddingLeft: 0, flexGrow: 1 }}
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="zenith"
                    />
                    <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>.dtabs.tech</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Owner First Name</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      value={ownerFirstName}
                      onChange={(e) => setOwnerFirstName(e.target.value)}
                      placeholder="Alex"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Owner Last Name</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      value={ownerLastName}
                      onChange={(e) => setOwnerLastName(e.target.value)}
                      placeholder="Mercer"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Owner Email Address *</label>
                  <input
                    type="email"
                    required
                    className="form-input"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="alex@zenithoptics.com"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">SaaS Subscription Plan</label>
                    <select className="form-select" value={plan} onChange={(e) => setPlan(e.target.value)}>
                      <option value={SAAS_PLANS.FREE}>Free Plan</option>
                      <option value={SAAS_PLANS.STARTER}>Starter Plan</option>
                      <option value={SAAS_PLANS.PROFESSIONAL}>Professional Plan</option>
                      <option value={SAAS_PLANS.ENTERPRISE}>Enterprise Plan</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Theme Foundation</label>
                    <select className="form-select" value={themeId} onChange={(e) => setThemeId(e.target.value)}>
                      <option value="fashion">Haute Fashion (Serif)</option>
                      <option value="electronics">Cyber Electronics (Cyan/Dark)</option>
                      <option value="minimal">Nordic Minimalist (Monochrome)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                  <button
                    type="submit"
                    disabled={provisioning || !storeName || !slug || !ownerEmail}
                    className="btn btn-primary"
                    style={{ flexGrow: 1, padding: '12px' }}
                  >
                    {provisioning ? 'Provisioning Tenant Store...' : 'Provision Tenant Shop 🚀'}
                  </button>
                  <button type="button" onClick={resetOnboardForm} className="btn btn-secondary">
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Global KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '36px' }}>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Total Stores</span>
          <h2 style={{ fontSize: '28px', fontWeight: '800', marginTop: '8px' }}>{stats?.totalTenants || tenants.length || 2}</h2>
          <span style={{ fontSize: '12px', color: '#34d399', marginTop: '4px', display: 'block' }}>Active Isolated Tenants</span>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Registered Users</span>
          <h2 style={{ fontSize: '28px', fontWeight: '800', marginTop: '8px' }}>{stats?.totalUsers || 3}</h2>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>Store Owners & Staff</span>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Global Orders</span>
          <h2 style={{ fontSize: '28px', fontWeight: '800', marginTop: '8px' }}>{stats?.totalGlobalOrders || 0}</h2>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>Across all merchants</span>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Global GMV</span>
          <h2 style={{ fontSize: '28px', fontWeight: '800', marginTop: '8px' }}>{formatCurrency(stats?.globalRevenue || 0)}</h2>
          <span style={{ fontSize: '12px', color: '#34d399', marginTop: '4px', display: 'block' }}>Gross Platform Volume</span>
        </div>
      </div>

      {/* Tenants Directory Table */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '36px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Tenant Directory</h3>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{tenants.length} Stores Provisioned</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255, 255, 255, 0.02)' }}>
              <th style={{ padding: '12px 16px' }}>Store Name</th>
              <th style={{ padding: '12px 16px' }}>Subdomain</th>
              <th style={{ padding: '12px 16px' }}>Owner</th>
              <th style={{ padding: '12px 16px' }}>Plan</th>
              <th style={{ padding: '12px 16px' }}>Theme</th>
              <th style={{ padding: '12px 16px' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading tenant directory...</td>
              </tr>
            ) : tenants.map((t) => (
              <tr key={t._id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '14px 16px', fontWeight: '600' }}>{t.name}</td>
                <td style={{ padding: '14px 16px', fontFamily: 'monospace' }}>{t.slug}.dtabs.tech</td>
                <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{t.ownerId?.email || 'Store Owner'}</td>
                <td style={{ padding: '14px 16px' }}>
                  <span className="badge badge-primary">{t.plan?.toUpperCase()}</span>
                </td>
                <td style={{ padding: '14px 16px' }}>{t.theme?.id || 'fashion'}</td>
                <td style={{ padding: '14px 16px' }}>
                  <span className={`badge ${t.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                    {t.status}
                  </span>
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <Link href={`/admin/dashboard?tenant=${t.slug}`} target="_blank" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px', marginRight: '8px' }}>
                    Admin
                  </Link>
                  <Link href={`/?tenant=${t.slug}`} target="_blank" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }}>
                    Storefront
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* SaaS Subscription Plans & Limits Matrix */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>SaaS Plan Entitlements Matrix</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {Object.entries(PLAN_LIMITS).map(([planName, limits]) => (
            <div key={planName} style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <strong style={{ fontSize: '16px', color: 'var(--theme-accent)', textTransform: 'uppercase' }}>
                {planName}
              </strong>
              <ul style={{ listStyle: 'none', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <li>Max Products: <strong>{limits.maxProducts === Infinity ? 'Unlimited' : limits.maxProducts}</strong></li>
                <li>Max Admins: <strong>{limits.maxAdmins === Infinity ? 'Unlimited' : limits.maxAdmins}</strong></li>
                <li>Monthly Orders: <strong>{limits.maxMonthlyOrders === Infinity ? 'Unlimited' : limits.maxMonthlyOrders}</strong></li>
                <li>Custom Domains: <strong>{limits.allowCustomDomain ? 'Supported' : 'Subdomain only'}</strong></li>
                <li>Themes Included: <strong>{limits.availableThemes.join(', ')}</strong></li>
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
