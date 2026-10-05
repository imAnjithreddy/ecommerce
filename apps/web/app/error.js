'use client';

export default function Error({ error, reset }) {
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
      <div style={{ fontSize: '56px', marginBottom: '16px' }}>⚠️</div>
      <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}>Something went wrong</h1>
      <p style={{ color: 'var(--text-secondary)', maxWidth: '440px', marginBottom: '24px' }}>
        {error?.message || 'An error occurred while loading the storefront interface.'}
      </p>
      <button onClick={() => reset()} className="btn btn-primary">
        Try Again
      </button>
    </div>
  );
}
