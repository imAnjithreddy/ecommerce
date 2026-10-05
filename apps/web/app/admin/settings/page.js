'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export default function AdminSettingsPage() {
  const searchParams = useSearchParams();
  const tenantSlug = searchParams.get('tenant') || 'aurora';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [timezone, setTimezone] = useState('UTC');
  const [supportEmail, setSupportEmail] = useState('');
  const [domains, setDomains] = useState([]);
  const [newDomain, setNewDomain] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API_BASE}/storefront/info`, {
          headers: { 'x-tenant-slug': tenantSlug }
        });

        if (res.ok) {
          const json = await res.json();
          const tenant = json.data;
          setStoreName(tenant.settings?.storeName || tenant.name);
          setCurrency(tenant.settings?.currency || 'USD');
          setTimezone(tenant.settings?.timezone || 'UTC');
          setSupportEmail(tenant.settings?.supportEmail || '');
          setDomains(tenant.domains || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [tenantSlug]);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const token = localStorage.getItem('dtabs_token');
      const res = await fetch(`${API_BASE}/admin/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          storeName,
          currency,
          timezone,
          supportEmail
        })
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        const err = await res.json();
        alert(err.error?.message || 'Failed to update settings');
      }
    } catch (err) {
      alert('Error updating settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddDomain = async (e) => {
    e.preventDefault();
    if (!newDomain) return;

    try {
      const token = localStorage.getItem('dtabs_token');
      const res = await fetch(`${API_BASE}/admin/domains`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ hostname: newDomain })
      });

      if (res.ok) {
        const data = await res.json();
        setDomains(data.data);
        setNewDomain('');
      } else {
        const err = await res.json();
        alert(err.error?.message || 'Failed to add custom domain');
      }
    } catch (err) {
      alert('Error registering domain');
    }
  };

  return (
    <div style={{ maxWidth: '780px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800' }}>Store Settings & Domains</h1>
        <p style={{ color: 'var(--text-secondary)' }}>General store configuration and custom merchant domain mapping</p>
      </div>

      <form onSubmit={handleSaveSettings} className="glass-panel" style={{ padding: '28px', marginBottom: '32px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>Store Profile</h3>

        <div className="form-group">
          <label className="form-label">Store Brand Name</label>
          <input
            type="text"
            required
            className="form-input"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="form-group">
            <label className="form-label">Currency</label>
            <select
              className="form-select"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option value="USD">USD ($ - US Dollar)</option>
              <option value="EUR">EUR (€ - Euro)</option>
              <option value="GBP">GBP (£ - British Pound)</option>
              <option value="CAD">CAD ($ - Canadian Dollar)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Timezone</label>
            <select
              className="form-select"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              <option value="UTC">UTC (Universal)</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Customer Support Email</label>
          <input
            type="email"
            className="form-input"
            value={supportEmail}
            onChange={(e) => setSupportEmail(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          {saveSuccess && (
            <span style={{ color: '#34d399', fontSize: '14px', fontWeight: '600' }}>
              ✓ Settings saved successfully!
            </span>
          )}
        </div>
      </form>

      {/* Domain Mapping Section */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '12px' }}>Domain Routing & Tenant Identity</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
          Incoming traffic on these domains will automatically resolve to your store with strict isolation.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          {domains.map((dom, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div>
                <strong style={{ fontSize: '14px', fontFamily: 'monospace' }}>{dom.hostname}</strong>
                <span style={{ marginLeft: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>({dom.type})</span>
              </div>
              <span className="badge badge-success" style={{ fontSize: '10px' }}>Verified</span>
            </div>
          ))}
        </div>

        <form onSubmit={handleAddDomain} style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            placeholder="e.g. www.mystore.com or shop.custombrand.org"
            className="form-input"
            style={{ flexGrow: 1 }}
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
          />
          <button type="submit" className="btn btn-secondary">
            Connect Domain
          </button>
        </form>
      </div>
    </div>
  );
}
