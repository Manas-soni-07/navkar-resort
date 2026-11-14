export default function HomePage() {
  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#F8F9FA',
        color: '#1A202C',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          padding: '2.5rem',
          borderRadius: '16px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          maxWidth: '540px',
          width: '100%',
          border: '1px solid #E2E8F0',
        }}
      >
        <div
          style={{
            display: 'inline-block',
            padding: '6px 14px',
            backgroundColor: '#EBF4FF',
            color: '#2B6CB0',
            borderRadius: '9999px',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: '1rem',
          }}
        >
          Phase 1 Foundation
        </div>
        <h1 style={{ fontSize: '2rem', margin: '0 0 0.5rem 0', letterSpacing: '-0.02em' }}>
          ResortOS API
        </h1>
        <p style={{ color: '#718096', fontSize: '1rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
          Backend REST API engine for hotel & resort management.
        </p>
        <a
          href="/api/health"
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#1E293B',
            color: '#FFFFFF',
            textDecoration: 'none',
            borderRadius: '10px',
            fontWeight: 500,
            fontSize: '0.95rem',
          }}
        >
          Check API Health Status →
        </a>
      </div>
    </main>
  );
}
