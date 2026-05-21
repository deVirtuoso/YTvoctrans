'use client';

export default function CheckoutCancelPage() {
  return (
    <div style={styles.container}>
      <div style={styles.glowLeft}></div>
      <div style={styles.glowRight}></div>
      <div style={styles.card}>
        <div style={styles.iconContainer}>
          <svg style={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <h1 style={styles.title}>Checkout Cancelled</h1>
        <p style={styles.subtitle}>
          The upgrade process was cancelled and no payments were processed. You are still on the free trial tier.
        </p>
        
        <p style={styles.actionText}>
          You can reopen the extension popup and click the <strong>Upgrade to Pro</strong> button again whenever you are ready.
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    position: 'relative',
    overflow: 'hidden',
    padding: '20px',
  },
  glowLeft: {
    position: 'absolute',
    width: '350px',
    height: '350px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(239, 68, 68, 0.1) 0%, rgba(0, 0, 0, 0) 70%)',
    top: '10%',
    left: '10%',
    pointerEvents: 'none',
  },
  glowRight: {
    position: 'absolute',
    width: '350px',
    height: '350px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(245, 158, 11, 0.1) 0%, rgba(0, 0, 0, 0) 70%)',
    bottom: '10%',
    right: '10%',
    pointerEvents: 'none',
  },
  card: {
    width: '100%',
    maxWidth: '460px',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '16px',
    padding: '40px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    textAlign: 'center',
    zIndex: 1,
  },
  iconContainer: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: '#450a0a',
    color: '#ef4444',
    marginBottom: '24px',
  },
  icon: {
    width: '32px',
    height: '32px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '800',
    color: '#f8fafc',
    margin: '0 0 12px 0',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '15px',
    color: '#94a3b8',
    lineHeight: '1.6',
    margin: '0 0 24px 0',
  },
  actionText: {
    fontSize: '14px',
    color: '#64748b',
    lineHeight: '1.6',
    margin: 0,
  },
};
