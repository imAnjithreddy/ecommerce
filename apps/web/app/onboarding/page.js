'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [storeName, setStoreName] = useState('');
  const [slug, setSlug] = useState('');
  const [themeId, setThemeId] = useState('fashion');
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleNameChange = (e) => {
    const val = e.target.value;
    setStoreName(val);
    // Auto-generate slug from store name
    const autoSlug = val.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    setSlug(autoSlug);
  };

  const handleCreateStore = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Check if user is logged in, if not log in with default merchant user or prompt login
      let token = localStorage.getItem('dtabs_token');
      if (!token) {
        // Auto authenticate demo merchant for effortless onboarding test
        const loginRes = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'owner@aurorafashion.com', password: 'password123' })
        });
        if (loginRes.ok) {
          const authData = await loginRes.json();
          token = authData.data.token;
          localStorage.setItem('dtabs_token', token);
        }
      }

      const res = await fetch(`${API_BASE}/tenants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name: storeName,
          slug,
          themeId,
          currency
        })
      });

      const data = await res.json();
      if (res.ok) {
        router.push(`/admin/dashboard?tenant=${slug}`);
      } else {
        setError(data.error?.message || 'Failed to provision store');
      }
    } catch (err) {
      setError('Network error provisioning new store');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', background: 'radial-gradient(circle at top, #1e1b4b 0%, #0b0f19 70%)' }}>
      <div className="glass-panel" style={{ maxWidth: '640px', width: '100%', padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '800',
            fontSize: '24px',
            color: '#fff',
            marginBottom: '16px'
          }}>
            D
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}>Launch Your Store on DTabs</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
            Multi-tenant e-commerce with dedicated subdomain, isolated inventory, and instant payments.
          </p>
        </div>

        {error && (
          <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#f87171', fontSize: '14px', marginBottom: '24px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleCreateStore} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="form-group">
            <label className="form-label">Store Brand Name *</label>
            <input
              type="text"
              required
              className="form-input"
              value={storeName}
              onChange={handleNameChange}
              placeholder="e.g. Horizon Optics"
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
                placeholder="horizon"
              />
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>.dtabs.tech</span>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Your permanent tenant address. Custom domains can be connected later.
            </span>
          </div>

          <div>
            <label className="form-label" style={{ marginBottom: '10px', display: 'block' }}>Choose Default Theme</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {[
                { id: 'fashion', name: 'Haute Fashion', desc: 'Editorial serif' },
                { id: 'electronics', name: 'Cyber Tech', desc: 'Futuristic cyan' },
                { id: 'minimal', name: 'Minimalist', desc: 'Nordic monochrome' }
              ].map((th) => (
                <div
                  key={th.id}
                  onClick={() => setThemeId(th.id)}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    border: themeId === th.id ? '2px solid #6366f1' : '1px solid var(--border-subtle)',
                    background: themeId === th.id ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  <strong style={{ fontSize: '13px', display: 'block' }}>{th.name}</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{th.desc}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !storeName || !slug}
            className="btn btn-primary"
            style={{ padding: '14px', fontSize: '16px', marginTop: '8px' }}
          >
            {loading ? 'Provisioning Isolated Tenant...' : 'Create & Launch Store 🚀'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
          Already have a store? <Link href="/login" style={{ color: 'var(--theme-accent)' }}>Sign In to Dashboard</Link>
        </div>
      </div>
    </div>
  );
}
