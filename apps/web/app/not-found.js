import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '24px'
    }}>
      <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏬</div>
      <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '8px' }}>Store or Page Not Found</h1>
      <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', marginBottom: '24px' }}>
        The requested store, domain, or product page could not be located on DTabs Commerce.
      </p>
      <Link href="/" className="btn btn-primary">
        Return to Home
      </Link>
    </div>
  );
}
