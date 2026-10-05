import { Suspense } from 'react';
import Header from '../../components/storefront/Header';
import Footer from '../../components/storefront/Footer';
import { getResolvedTenant } from '../../lib/tenant/resolver';
import { generateThemeCssVariables } from '../../components/themes/themeRegistry';

export const dynamic = 'force-dynamic';

export default async function StoreLayout({ children, searchParams }) {
  const tenant = await getResolvedTenant(searchParams);
  const cssVars = generateThemeCssVariables(tenant?.theme);

  return (
    <div style={{ ...cssVars, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Suspense fallback={null}>
        <Header tenant={tenant} />
      </Suspense>
      <main style={{ flexGrow: 1 }}>
        <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>}>
          {children}
        </Suspense>
      </main>
      <Footer tenant={tenant} />
    </div>
  );
}
