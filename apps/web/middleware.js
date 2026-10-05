import { NextResponse } from 'next/server';

export function middleware(request) {
  const url = request.nextUrl.clone();
  const host = request.headers.get('host') || '';
  const searchParams = url.searchParams;

  // Extract subdomain if on dtabs.tech or localhost with subdomain
  let tenantSlug = null;
  const platformDomain = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 'dtabs.tech';

  const cleanHost = host.toLowerCase().split(':')[0];

  if (cleanHost.endsWith(platformDomain)) {
    const parts = cleanHost.replace(platformDomain, '').replace(/\.$/, '').split('.');
    if (parts.length > 0 && parts[0] && parts[0] !== 'www' && parts[0] !== 'admin') {
      tenantSlug = parts[0];
    }
  } else if (cleanHost.includes('localhost') || cleanHost.includes('127.0.0.1')) {
    const parts = cleanHost.split('.');
    if (parts.length > 1 && parts[0] !== 'localhost') {
      tenantSlug = parts[0];
    }
  }

  // Allow query parameter override (?tenant=aurora or ?tenant=volt)
  if (searchParams.has('tenant')) {
    tenantSlug = searchParams.get('tenant');
  }

  // Clone headers and inject resolved tenant slug & host
  const requestHeaders = new Headers(request.headers);
  if (tenantSlug) {
    requestHeaders.set('x-tenant-slug', tenantSlug);
  }
  requestHeaders.set('x-tenant-host', cleanHost);

  return NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)'
  ]
};
