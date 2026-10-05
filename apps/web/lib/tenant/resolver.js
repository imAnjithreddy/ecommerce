import { headers } from 'next/headers';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

/**
 * Server-side tenant resolver for Next.js App Router Server Components
 */
export async function getResolvedTenant(searchParams = {}) {
  try {
    const headersList = headers();
    const host = headersList.get('host') || '';
    const headerTenantId = headersList.get('x-tenant-id');
    const headerTenantSlug = headersList.get('x-tenant-slug');

    // Support query override for easy local development testing (?tenant=aurora or ?tenant=volt)
    const paramTenant = searchParams?.tenant || headerTenantSlug || null;

    const requestHeaders = {
      'Content-Type': 'application/json'
    };

    if (headerTenantId) {
      requestHeaders['x-tenant-id'] = headerTenantId;
    } else if (paramTenant) {
      requestHeaders['x-tenant-slug'] = paramTenant;
    } else {
      requestHeaders['host'] = host;
    }

    const res = await fetch(`${API_BASE}/storefront/info`, {
      headers: requestHeaders,
      next: { revalidate: 60 } // Cache for 60 seconds
    });

    if (!res.ok) {
      // Fallback default for previewing or when direct host doesn't match
      return {
        tenantId: 'demo-tenant',
        name: 'DTabs Demo Store',
        slug: paramTenant || 'aurora',
        theme: {
          id: 'fashion',
          settings: {
            primaryColor: '#881337',
            secondaryColor: '#fff1f2',
            accentColor: '#fb7185',
            fontFamily: 'Playfair Display',
            bannerText: 'Autumn Elegance Collection 2026'
          }
        },
        settings: {
          currency: 'USD',
          storeName: 'DTabs Demo Store'
        }
      };
    }

    const json = await res.json();
    return json.data;
  } catch (err) {
    return {
      tenantId: 'fallback',
      name: 'Aurora Luxe Fashion',
      slug: 'aurora',
      theme: {
        id: 'fashion',
        settings: {
          primaryColor: '#881337',
          accentColor: '#fb7185',
          fontFamily: 'Playfair Display',
          bannerText: 'Autumn Elegance Collection 2026'
        }
      },
      settings: { currency: 'USD', storeName: 'Aurora Luxe Fashion' }
    };
  }
}
