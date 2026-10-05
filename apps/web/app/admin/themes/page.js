'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { THEME_REGISTRY } from '../../../components/themes/themeRegistry';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export default function AdminThemesPage() {
  const searchParams = useSearchParams();
  const tenantSlug = searchParams.get('tenant') || 'aurora';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedThemeId, setSelectedThemeId] = useState('fashion');
  const [primaryColor, setPrimaryColor] = useState('#881337');
  const [accentColor, setAccentColor] = useState('#fb7185');
  const [bannerText, setBannerText] = useState('Curated Elegance - Autumn Collection');
  const [headerLayout, setHeaderLayout] = useState('centered');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const fetchTheme = async () => {
      try {
        const res = await fetch(`${API_BASE}/storefront/info`, {
          headers: { 'x-tenant-slug': tenantSlug }
        });

        if (res.ok) {
          const json = await res.json();
          const theme = json.data?.theme;
          if (theme) {
            setSelectedThemeId(theme.id || 'fashion');
            setPrimaryColor(theme.settings?.primaryColor || '#881337');
            setAccentColor(theme.settings?.accentColor || '#fb7185');
            setBannerText(theme.settings?.bannerText || 'Welcome to our store');
            setHeaderLayout(theme.settings?.headerLayout || 'centered');
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTheme();
  }, [tenantSlug]);

  const handleSaveTheme = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const token = localStorage.getItem('dtabs_token');
      const res = await fetch(`${API_BASE}/admin/theme`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          themeId: selectedThemeId,
          settings: {
            primaryColor,
            accentColor,
            bannerText,
            headerLayout
          }
        })
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        const err = await res.json();
        alert(err.error?.message || 'Failed to update theme');
      }
    } catch (err) {
      alert('Network error updating theme');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectThemeCard = (themeId) => {
    setSelectedThemeId(themeId);
    const defaults = THEME_REGISTRY[themeId]?.defaultSettings;
    if (defaults) {
      setPrimaryColor(defaults.primaryColor);
      setAccentColor(defaults.accentColor);
      setHeaderLayout(defaults.headerLayout);
      setBannerText(defaults.bannerText);
    }
  };

  return (
    <div style={{ maxWidth: '840px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800' }}>Theme Engine & Branding</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Customize your storefront presentation layer without modifying core business logic
        </p>
      </div>

      <form onSubmit={handleSaveTheme} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {/* Theme Selector Cards */}
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Select Design Foundation</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            {Object.entries(THEME_REGISTRY).map(([id, theme]) => (
              <div
                key={id}
                onClick={() => handleSelectThemeCard(id)}
                className="glass-panel"
                style={{
                  padding: '20px',
                  cursor: 'pointer',
                  border: selectedThemeId === id ? '2px solid var(--theme-accent)' : '1px solid var(--border-subtle)',
                  background: selectedThemeId === id ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-glass)',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: '700' }}>{theme.name}</h4>
                  {selectedThemeId === id && <span className="badge badge-primary">Active</span>}
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  {theme.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Brand Tokens */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>Color Palette & Typography</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="form-group">
              <label className="form-label">Primary Brand Color</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  style={{ width: '44px', height: '44px', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'none' }}
                />
                <input
                  type="text"
                  className="form-input"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  style={{ fontFamily: 'monospace' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Accent / Highlight Color</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  style={{ width: '44px', height: '44px', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'none' }}
                />
                <input
                  type="text"
                  className="form-input"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  style={{ fontFamily: 'monospace' }}
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Homepage Hero Banner Headline</label>
            <input
              type="text"
              className="form-input"
              value={bannerText}
              onChange={(e) => setBannerText(e.target.value)}
              placeholder="e.g. Discover Tomorrow's Innovations"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Navigation Header Layout</label>
            <select
              className="form-select"
              value={headerLayout}
              onChange={(e) => setHeaderLayout(e.target.value)}
            >
              <option value="centered">Centered Editorial (Fashion)</option>
              <option value="search-prominent">Search Prominent (Electronics & Tech)</option>
              <option value="split">Split Minimal (Nordic)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary"
            style={{ padding: '12px 28px' }}
          >
            {saving ? 'Publishing Theme...' : 'Save & Publish Theme'}
          </button>
          {saveSuccess && (
            <span style={{ color: '#34d399', fontSize: '14px', fontWeight: '600' }}>
              ✓ Theme changes published to storefront!
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
