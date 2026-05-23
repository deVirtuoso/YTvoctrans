import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div style={styles.container}>
      <div style={styles.glowLeft}></div>
      <div style={styles.glowRight}></div>
      
      <div style={styles.card}>
        <div style={styles.header}>
          <Link href="/" style={styles.backBtn}>
            &larr; Back to Home
          </Link>
          <h1 style={styles.title}>Privacy Policy</h1>
          <p style={styles.subtitle}>Effective Date: May 24, 2026</p>
        </div>

        <div style={styles.scrollContent}>
          <p style={styles.paragraph}>
            At <strong>VoiceTranslate Lite</strong>, we are committed to protecting your privacy. This Privacy Policy describes how we collect, use, and handle your information when you use our browser extension and associated subscription backend services.
          </p>

          <h2 style={styles.sectionTitle}>1. Information We Collect</h2>
          <p style={styles.paragraph}>
            To provide the VoiceTranslate Lite extension services and manage your subscription, we collect the following types of information:
          </p>
          <ul style={styles.list}>
            <li style={styles.listItem}>
              <strong>Google Account Information:</strong> When you register or log in using Google OAuth 2.0, we collect your email address, display name, and unique Google account identifier.
            </li>
            <li style={styles.listItem}>
              <strong>Subscription and Billing Information:</strong> We use Stripe to process payments. We do not store credit card details on our servers; Stripe securely handles all payment transactions.
            </li>
            <li style={styles.listItem}>
              <strong>YouTube Video and Translation Requests:</strong> When using the extension, we process the YouTube video ID, audio/video duration, and requested subtitle tracks to generate translated voice dubs. This data is processed temporarily and is not linked to your personal identity.
            </li>
            <li style={styles.listItem}>
              <strong>Extension Permissions:</strong> The extension requires access to local <code>storage</code> to save your settings (e.g., volume, voice speed, and target language) and the <code>tabs</code> permission to coordinate real-time dubbing with active YouTube video players.
            </li>
          </ul>

          <h2 style={styles.sectionTitle}>2. How We Use Your Information</h2>
          <p style={styles.paragraph}>
            We use the collected information for the following purposes:
          </p>
          <ul style={styles.list}>
            <li style={styles.listItem}>To authenticate your identity and grant access to the translation backend.</li>
            <li style={styles.listItem}>To manage and renew your subscription tier or usage limits.</li>
            <li style={styles.listItem}>To synthesize and deliver real-time voice translation streams.</li>
            <li style={styles.listItem}>To maintain security, perform debugging, and improve the extension.</li>
          </ul>

          <h2 style={styles.sectionTitle}>3. Google API Scopes & Limited Use</h2>
          <p style={styles.paragraph}>
            Our use of information received from Google APIs will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" style={styles.link}>Google API Services User Data Policy</a>, including the Limited Use requirements. We do not transfer, sell, or disclose your Google user data to third-party developers, ad networks, or data brokers.
          </p>

          <h2 style={styles.sectionTitle}>4. Data Sharing and Third Parties</h2>
          <p style={styles.paragraph}>
            We do not share your personal data with third parties except in the following limited circumstances:
          </p>
          <ul style={styles.list}>
            <li style={styles.listItem}>
              <strong>Service Providers:</strong> We share data with Stripe (for payment processing) and Vercel/Turso (for hosting and database storage) to the minimum extent necessary to provide the service.
            </li>
            <li style={styles.listItem}>
              <strong>Legal Compliance:</strong> We may disclose information if required by law, regulation, or legal process.
            </li>
          </ul>

          <h2 style={styles.sectionTitle}>5. Data Retention and Deletion</h2>
          <p style={styles.paragraph}>
            We retain your Google Account and subscription metadata as long as your account is active. You can request the deletion of your account and all associated personal data at any time by contacting our support team at <a href="mailto:support@voicetranslate.net" style={styles.link}>support@voicetranslate.net</a>. Once requested, your personal data will be permanently removed from our databases within 30 days.
          </p>

          <h2 style={styles.sectionTitle}>6. Security</h2>
          <p style={styles.paragraph}>
            We employ industry-standard administrative, physical, and technical measures designed to safeguard your information from unauthorized access, loss, or alteration. However, no security system is completely infallible.
          </p>

          <h2 style={styles.sectionTitle}>7. Changes to This Policy</h2>
          <p style={styles.paragraph}>
            We may update our Privacy Policy from time to time. Any changes will be reflected on this page with an updated effective date.
          </p>

          <h2 style={styles.sectionTitle}>8. Contact Us</h2>
          <p style={styles.paragraph}>
            If you have questions, feedback, or concerns regarding your privacy or data usage, please reach out to us at <a href="mailto:support@voicetranslate.net" style={styles.link}>support@voicetranslate.net</a>.
          </p>
        </div>

        <div style={styles.footer}>
          <p style={styles.footerText}>VoiceTranslate Lite &copy; 2026. All rights reserved.</p>
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
    padding: '40px 20px',
  },
  glowLeft: {
    position: 'absolute',
    width: '450px',
    height: '450px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(79, 70, 229, 0.08) 0%, rgba(0, 0, 0, 0) 70%)',
    top: '10%',
    left: '5%',
    pointerEvents: 'none',
  },
  glowRight: {
    position: 'absolute',
    width: '450px',
    height: '450px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(168, 85, 247, 0.08) 0%, rgba(0, 0, 0, 0) 70%)',
    bottom: '10%',
    right: '5%',
    pointerEvents: 'none',
  },
  card: {
    width: '100%',
    maxWidth: '800px',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '16px',
    padding: '40px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    borderBottom: '1px solid #334155',
    paddingBottom: '24px',
    marginBottom: '28px',
  },
  backBtn: {
    color: '#a5b4fc',
    fontSize: '14px',
    fontWeight: '600',
    textDecoration: 'none',
    display: 'inline-block',
    marginBottom: '16px',
    transition: 'color 0.2s',
  },
  title: {
    fontSize: '36px',
    fontWeight: '800',
    color: '#f8fafc',
    margin: '0 0 8px 0',
    letterSpacing: '-1px',
    background: 'linear-gradient(135deg, #ffffff 40%, #a5b4fc 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
  scrollContent: {
    color: '#cbd5e1',
    lineHeight: '1.7',
    fontSize: '15px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#f8fafc',
    marginTop: '32px',
    marginBottom: '12px',
  },
  paragraph: {
    marginBottom: '16px',
  },
  list: {
    paddingLeft: '24px',
    marginBottom: '20px',
  },
  listItem: {
    marginBottom: '10px',
  },
  link: {
    color: '#a5b4fc',
    textDecoration: 'none',
    borderBottom: '1px dotted #a5b4fc',
    transition: 'color 0.2s, border-bottom-color 0.2s',
  },
  footer: {
    marginTop: '40px',
    paddingTop: '20px',
    borderTop: '1px solid #334155',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '13px',
    color: '#64748b',
    margin: 0,
  },
};
