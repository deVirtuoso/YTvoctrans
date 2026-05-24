export const metadata = {
  title: 'Terms of Service | VoiceTranslate Lite',
  description: 'The rules for using VoiceTranslate Lite.',
};

const LAST_UPDATED = 'May 24, 2026';
const CONTACT_EMAIL = 'bondelero@gmail.com';

export default function TermsOfServicePage() {
  return (
    <main style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.h1}>Terms of Service</h1>
        <p style={styles.muted}>Last updated: {LAST_UPDATED}</p>

        <p style={styles.p}>
          These Terms of Service (&quot;Terms&quot;) govern your use of the VoiceTranslate Lite
          Chrome extension and the backend services available at{' '}
          <a href="https://y-tvoctrans.vercel.app" style={styles.a}>
            https://y-tvoctrans.vercel.app
          </a>{' '}
          (together, the &quot;Service&quot;). By creating an account or using the Service you
          agree to these Terms.
        </p>

        <h2 style={styles.h2}>1. What the Service does</h2>
        <p style={styles.p}>
          VoiceTranslate Lite extracts subtitle tracks from publicly accessible YouTube videos,
          translates them into your chosen target language, and synthesizes spoken audio that plays
          alongside the video.
        </p>

        <h2 style={styles.h2}>2. Account eligibility</h2>
        <p style={styles.p}>
          You must be at least 13 years old to use the Service. You are responsible for keeping
          your password secure and for all activity under your account.
        </p>

        <h2 style={styles.h2}>3. Free tier and Pro subscription</h2>
        <ul style={styles.ul}>
          <li>
            The free tier permits a limited number of translation jobs per day and per month.
            Limits are visible in the extension popup.
          </li>
          <li>
            The Pro subscription is billed monthly through Stripe. Subscriptions auto-renew until
            cancelled.
          </li>
          <li>
            You may cancel at any time from the Stripe customer portal; access continues until the
            end of the current billing period.
          </li>
          <li>
            Refunds are issued at our discretion. Contact{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={styles.a}>{CONTACT_EMAIL}</a>.
          </li>
        </ul>

        <h2 style={styles.h2}>4. Acceptable use</h2>
        <p style={styles.p}>You agree not to:</p>
        <ul style={styles.ul}>
          <li>Use the Service to violate any law or third-party rights, including copyright.</li>
          <li>
            Attempt to bypass usage limits, share account credentials, or operate multiple
            accounts to evade quotas.
          </li>
          <li>Reverse-engineer, scrape, or probe the backend beyond documented APIs.</li>
          <li>Resell, sublicense, or expose the Service to your own customers without prior written agreement.</li>
          <li>Submit content that is illegal, defamatory, or infringes another party&apos;s rights.</li>
        </ul>

        <h2 style={styles.h2}>5. YouTube and third-party content</h2>
        <p style={styles.p}>
          You are responsible for ensuring you have the right to translate and play the content you
          submit. The Service relies on publicly available subtitle tracks; we do not modify or
          redistribute the underlying video. YouTube&apos;s Terms of Service apply to your use of
          their platform.
        </p>

        <h2 style={styles.h2}>6. Intellectual property</h2>
        <p style={styles.p}>
          The Service, including the extension code and backend, is owned by the VoiceTranslate
          Lite authors. You receive a limited, non-exclusive, non-transferable licence to use it
          for personal, non-commercial purposes.
        </p>

        <h2 style={styles.h2}>7. Service availability</h2>
        <p style={styles.p}>
          We aim for high availability but do not guarantee uptime. The Service is provided
          &quot;as is&quot; without warranty of any kind. We may add, modify, or remove features at
          any time.
        </p>

        <h2 style={styles.h2}>8. Limitation of liability</h2>
        <p style={styles.p}>
          To the maximum extent permitted by law, our total liability for any claim related to the
          Service is capped at the amount you paid us in the twelve months preceding the claim. We
          are not liable for indirect, incidental, or consequential damages.
        </p>

        <h2 style={styles.h2}>9. Termination</h2>
        <p style={styles.p}>
          You may delete your account at any time by emailing{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} style={styles.a}>{CONTACT_EMAIL}</a>. We may suspend
          or terminate accounts that violate these Terms.
        </p>

        <h2 style={styles.h2}>10. Changes</h2>
        <p style={styles.p}>
          We may update these Terms. Material changes will be announced by email to active
          subscribers and noted at the top of this page.
        </p>

        <h2 style={styles.h2}>11. Contact</h2>
        <p style={styles.p}>
          Questions about these Terms? Email{' '}
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
};
