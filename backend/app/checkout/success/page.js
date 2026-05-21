'use client';

export default function CheckoutSuccessPage() {
  return (
    <div style={styles.container}>
      <div style={styles.glowLeft}></div>
      <div style={styles.glowRight}></div>
      <div style={styles.card}>
        <div style={styles.badge}>Pro Tier Active</div>
        <h1 style={styles.title}>Subscription Successful!</h1>
        <p style={styles.subtitle}>
          Thank you for subscribing to <strong>VoiceTranslate Pro</strong>. Your unlimited access has been activated.
        </p>
        
        <div style={styles.instructions}>
          <h2 style={styles.instructionsTitle}>What to do next:</h2>
          <ol style={styles.list}>
            <li style={styles.listItem}>Close this tab.</li>
            <li style={styles.listItem}>Reopen the Chrome Extension popup to verify your Pro status.</li>
            <li style={styles.listItem}>Refresh any active YouTube videos to start unlimited voice translation.</li>
          </ol>
        </div>

        <p style={styles.footerText}>
          If you have any questions or require billing assistance, please contact support.
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
    background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, rgba(0, 0, 0, 0) 70%)',
    top: '10%',
    left: '10%',
    pointerEvents: 'none',
  },
  glowRight: {
    position: 'absolute',
    width: '350px',
    height: '350px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(79, 70, 229, 0.15) 0%, rgba(0, 0, 0, 0) 70%)',
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
  badge: {
    display: 'inline-block',
    padding: '6px 16px',
    backgroundColor: '#064e3b',
    color: '#34d399',
    fontWeight: '700',
    borderRadius: '9999px',
    fontSize: '13px',
    marginBottom: '24px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
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
    margin: '0 0 32px 0',
  },
  instructions: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '12px',
    padding: '24px',
    textAlign: 'left',
    marginBottom: '32px',
  },
  instructionsTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#e2e8f0',
    margin: '0 0 12px 0',
  },
  list: {
    margin: 0,
    paddingLeft: '20px',
    color: '#94a3b8',
    fontSize: '14px',
    lineHeight: '1.8',
  },
  listItem: {
    marginBottom: '8px',
  },
  footerText: {
    fontSize: '13px',
    color: '#64748b',
    margin: 0,
    lineHeight: '1.5',
  },
};
