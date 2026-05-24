export const metadata = {
  title: 'Privacy Policy | VoiceTranslate Lite',
  description: 'How VoiceTranslate Lite collects, uses, and protects your data.',
};

const LAST_UPDATED = 'May 24, 2026';
const CONTACT_EMAIL = 'bondelero@gmail.com';

export default function PrivacyPolicyPage() {
  return (
    <main style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.h1}>Privacy Policy</h1>
        <p style={styles.muted}>Last updated: {LAST_UPDATED}</p>

        <p style={styles.p}>
          VoiceTranslate Lite (the &quot;Extension&quot;, &quot;we&quot;, &quot;us&quot;) is a Chrome
          browser extension that produces real-time translated voice-over for YouTube videos.
          This Privacy Policy explains what data we collect, how we use it, and the choices you
          have.
        </p>

        <h2 style={styles.h2}>1. Data we collect</h2>
        <ul style={styles.ul}>
          <li>
            <strong>Account data:</strong> if you sign up with email and password, we store your
            email address, a one-way bcrypt hash of your password, and verification / password-reset
            tokens.
          </li>
          <li>
            <strong>Google sign-in data:</strong> if you sign in with Google, we receive your email
            address and Google account ID from Google&apos;s OpenID Connect endpoint. We do not
            request access to Gmail, Drive, contacts, or any other Google service.
          </li>
          <li>
            <strong>Usage counters:</strong> we count the number of translation jobs you start per
            day and per month so we can enforce free-tier limits.
          </li>
          <li>
            <strong>Billing data:</strong> if you subscribe, Stripe (our payment processor) handles
            your card details directly. We only store a Stripe customer ID, subscription ID, status,
            and current billing-period end date.
          </li>
          <li>
            <strong>Translation jobs:</strong> the YouTube video URL you submit, the source and
            target languages, generated subtitle text, and synthesized audio segments. Jobs are
            retained while you may still play them back and are pruned periodically.
          </li>
        </ul>
        <p style={styles.p}>
          We do <strong>not</strong> collect or transmit your browsing history outside of YouTube
          pages you actively translate, and we do not sell personal data to anyone.
        </p>

        <h2 style={styles.h2}>2. How we use your data</h2>
        <ul style={styles.ul}>
          <li>To authenticate you and keep your session signed in.</li>
          <li>To send transactional emails (email verification, password reset) via Resend.</li>
          <li>To enforce free-tier usage limits and bill paid subscriptions.</li>
          <li>To produce and serve the translated audio you requested.</li>
          <li>To diagnose errors and improve reliability.</li>
        </ul>

        <h2 style={styles.h2}>3. Third parties we share data with</h2>
        <ul style={styles.ul}>
          <li>
            <strong>Vercel</strong> — application hosting (United States / EU edge).
          </li>
          <li>
            <strong>Turso</strong> — managed SQLite database.
          </li>
          <li>
            <strong>Resend</strong> — outbound transactional email.
          </li>
          <li>
            <strong>Stripe</strong> — payment processing and subscription management.
          </li>
          <li>
            <strong>Google</strong> — OAuth sign-in (only if you click &quot;Continue with Google&quot;).
          </li>
        </ul>
        <p style={styles.p}>
          Each of these processors is contractually obligated to protect your data and use it only
          to provide the service to us.
        </p>

        <h2 style={styles.h2}>4. Cookies and local storage</h2>
        <p style={styles.p}>
          We set a single <code style={styles.code}>session</code> cookie (HttpOnly, Secure,
          SameSite=None) to keep you signed in. The extension also uses
          <code style={styles.code}> chrome.storage.local</code> to cache your session, free-tier
          counters, and UI preferences on your device.
        </p>

        <h2 style={styles.h2}>5. Your rights</h2>
        <p style={styles.p}>
          You can delete your account and all associated data at any time by emailing{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} style={styles.a}>{CONTACT_EMAIL}</a>. Deletion is
          permanent and cascades to your subscription record, allowance counters, and translation
          history.
        </p>

        <h2 style={styles.h2}>6. Data retention</h2>
        <p style={styles.p}>
          Account and subscription records are kept while your account is active. Translation jobs
          and generated audio are pruned periodically. Webhook event logs from Stripe are kept for
          12 months for billing reconciliation.
        </p>

        <h2 style={styles.h2}>7. Children</h2>
        <p style={styles.p}>
          VoiceTranslate Lite is not directed to children under 13. If you believe a child has
          provided us data, contact us and we will delete it.
        </p>

        <h2 style={styles.h2}>8. Changes</h2>
        <p style={styles.p}>
          If we make material changes to this policy we will update the &quot;Last updated&quot;
          date above and, for subscribers, send a notice by email.
        </p>

        <h2 style={styles.h2}>9. Contact</h2>
        <p style={styles.p}>
          Questions? Email{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} style={styles.a}>{CONTACT_EMAIL}</a>.
        </p>
      </div>
    </main>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    padding: '60px 20px',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    color: '#e2e8f0',
  },
  card: {
    maxWidth: '760px',
    margin: '0 auto',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '16px',
    padding: '48px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
    lineHeight: '1.7',
  },
  h1: {
    fontSize: '36px',
    fontWeight: '800',
    margin: '0 0 8px 0',
    color: '#f8fafc',
    letterSpacing: '-0.5px',
  },
  h2: {
    fontSize: '20px',
    fontWeight: '700',
    margin: '32px 0 12px 0',
    color: '#f8fafc',
  },
  p: { margin: '0 0 14px 0', color: '#cbd5e1', fontSize: '15.5px' },
  muted: { color: '#94a3b8', fontSize: '13.5px', margin: '0 0 28px 0' },
  ul: { margin: '0 0 14px 0', paddingLeft: '22px', color: '#cbd5e1', fontSize: '15.5px' },
  a: { color: '#a5b4fc', textDecoration: 'underline' },
  code: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '4px',
    padding: '1px 6px',
    fontSize: '13.5px',
    color: '#fcd34d',
  },
};
