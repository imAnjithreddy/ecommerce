'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenantSlug = searchParams.get('tenant') || 'aurora';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('dtabs_token', data.data.token);
        localStorage.setItem('dtabs_user', JSON.stringify(data.data.user));

        if (data.data.user.isPlatformAdmin) {
          router.push(`/admin/dashboard?tenant=${tenantSlug}`);
        } else {
          router.push(`/admin/dashboard?tenant=${tenantSlug}`);
        }
      } else {
        setError(data.error?.message || 'Login failed');
      }
    } catch (err) {
      setError('Network error signing in');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="glass-panel" style={{ maxWidth: '440px', width: '100%', padding: '40px' }}>
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '6px' }}>Welcome Back</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Sign in to manage your DTabs online store</p>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#f87171', fontSize: '13px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Quick Demo Credentials */}
      <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px solid var(--border-subtle)', marginBottom: '20px', fontSize: '12px' }}>
        <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Quick Demo Logins:</span>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => fillDemo('owner@aurorafashion.com', 'password123')}
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '11px' }}
          >
            Aurora Fashion Owner
          </button>
          <button
            type="button"
            onClick={() => fillDemo('owner@voltelectronics.com', 'password123')}
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '11px' }}
          >
            Volt Tech Owner
          </button>
          <button
            type="button"
            onClick={() => fillDemo('admin@dtabs.tech', 'admin12345')}
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '11px' }}
          >
            Platform Admin
          </button>
        </div>
      </div>

      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="form-group">
          <label className="form-label">Email Address</label>
          <input
            type="email"
            required
            className="form-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@store.com"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            type="password"
            required
            className="form-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary"
          style={{ width: '100%', padding: '12px', marginTop: '8px' }}
        >
          {loading ? 'Authenticating...' : 'Sign In'}
        </button>
      </form>

      <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
        Don't have an account yet? <Link href="/register" style={{ color: 'var(--theme-accent)' }}>Register</Link> or <Link href="/onboarding" style={{ color: 'var(--theme-accent)' }}>Start a Store</Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'radial-gradient(circle at top, #1e1b4b 0%, #0b0f19 70%)' }}>
      <Suspense fallback={<div style={{ color: '#fff' }}>Loading login...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
