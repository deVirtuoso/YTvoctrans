import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={styles.container}>
      <div style={styles.glowLeft}></div>
      <div style={styles.glowRight}></div>
      
      <div style={styles.content}>
        <div style={styles.badge}>Next Generation Dubbing</div>
        <h1 style={styles.title}>VoiceTranslate Lite</h1>
        <p style={styles.subtitle}>
          Stateless real-time translated voice synthesis directly inside your browser. Enjoy natural, synchronized dubbing on YouTube videos in Spanish, Russian, English, and more.
        </p>

        <div style={styles.actions}>
          <a 
            href="https://chromewebstore.google.com/detail/pehpbnbmhhgbnhjmcdggodlfjlhfggja" 
            target="_blank" 
            rel="noopener noreferrer" 
            style={styles.primaryBtn}
          >
            Install Extension
          </a>
          <Link href="/auth/login" style={styles.secondaryBtn}>
            Manage Subscription
          </Link>
        </div>
        
        <div style={styles.footer}>
          <p style={styles.footerText}>
            VoiceTranslate Lite &copy; 2026. All rights reserved. &bull;{' '}
            <Link href="/privacy" style={styles.footerLink}>
              Privacy Policy
            </Link>
          </p>
        </div>
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
    width: '450px',
    height: '450px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(79, 70, 229, 0.12) 0%, rgba(0, 0, 0, 0) 70%)',
    top: '15%',
    left: '5%',
    pointerEvents: 'none',
  },
  glowRight: {
    position: 'absolute',
    width: '450px',
    height: '450px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(168, 85, 247, 0.12) 0%, rgba(0, 0, 0, 0) 70%)',
    bottom: '15%',
    right: '5%',
    pointerEvents: 'none',
  },
  content: {
    maxWidth: '640px',
    textAlign: 'center',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  badge: {
    display: 'inline-block',
    padding: '6px 16px',
    backgroundColor: '#312e81',
    color: '#a5b4fc',
    fontWeight: '700',
    borderRadius: '9999px',
    fontSize: '13px',
    marginBottom: '24px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  title: {
    fontSize: '52px',
    fontWeight: '900',
    color: '#f8fafc',
    margin: '0 0 20px 0',
    letterSpacing: '-1.5px',
    lineHeight: '1.1',
    background: 'linear-gradient(135deg, #ffffff 40%, #a5b4fc 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: '18px',
    color: '#94a3b8',
    lineHeight: '1.6',
    margin: '0 0 40px 0',
  },
  actions: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: '60px',
  },
  primaryBtn: {
    display: 'inline-block',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    textDecoration: 'none',
    borderRadius: '8px',
    padding: '14px 28px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.3)',
    transition: 'background-color 0.2s, transform 0.1s',
  },
  secondaryBtn: {
    display: 'inline-block',
    backgroundColor: '#1e293b',
    color: '#f8fafc',
    border: '1px solid #334155',
    textDecoration: 'none',
    borderRadius: '8px',
    padding: '14px 28px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s, border-color 0.2s',
  },
  footer: {
    marginTop: '20px',
  },
  footerText: {
    fontSize: '13px',
    color: '#475569',
    margin: 0,
  },
  footerLink: {
    color: '#64748b',
    textDecoration: 'none',
    transition: 'color 0.2s',
  },
};
