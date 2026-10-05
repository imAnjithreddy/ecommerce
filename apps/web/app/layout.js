import './globals.css';
import { Suspense } from 'react';

export const metadata = {
  title: 'DTabs Commerce | Multi-Tenant Cloud E-Commerce',
  description: 'Enterprise multi-tenant SaaS e-commerce platform with dynamic custom themes and strict tenant isolation.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <Suspense fallback={null}>
          {children}
        </Suspense>
      </body>
    </html>
  );
}
