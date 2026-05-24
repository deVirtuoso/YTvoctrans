'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '';
  const errorParam = searchParams.get('error') || '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle', 'submitting', 'success', 'error'
  const [errorMessage, setErrorMessage] = useState(
    errorParam === 'unauthorized'
      ? 'Please sign in to proceed with checkout.'
      : errorParam === 'session_expired'
      ? 'Your session expired. Please sign in again.'
      : ''
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Email and password are required.');
      return;
    }

    setStatus('submitting');
    setErrorMessage('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to authenticate');
      }
      
      setStatus('success');
      
      // Redirect to callbackUrl if present, e.g. /api/checkout
      if (callbackUrl) {
        router.push(callbackUrl);
      } else {
        router.push('/');
      }
    } catch (err) {
      setStatus('error');
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `/api/auth/google`;
  };

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h1 style={styles.title}>Sign In</h1>
        <p style={styles.subtitle}>Access your subscription and allowances</p>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        {errorMessage && (
          <div style={styles.errorAlert} role="alert">
            {errorMessage}
          </div>
        )}

        <div style={styles.field}>
          <label style={styles.label}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            placeholder="you@example.com"
            required
            disabled={status === 'submitting'}
          />
        </div>

        <div style={styles.field}>
          <div style={styles.labelRow}>
            <label style={styles.label}>Password</label>
            <Link href="/auth/forgot-password" style={styles.forgotLink}>
              Forgot password?
            </Link>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            placeholder="••••••••"
            required
            disabled={status === 'submitting'}
          />
        </div>

        <button
          type="submit"
          style={{
            ...styles.button,
            ...(status === 'submitting' ? styles.buttonDisabled : {}),
          }}
          disabled={status === 'submitting'}
        >
          {status === 'submitting' ? 'Signing In...' : 'Sign In'}
        </button>
      </form>

      <div style={styles.divider}>
        <span style={styles.dividerText}>or</span>
      </div>

      <button onClick={handleGoogleLogin} style={styles.googleButton}>
        <svg width="18" height="18" viewBox="0 0 24 24" style={styles.googleIcon}>
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>
      
      <p style={styles.footerNote}>
        Verify your account in the browser to sync extension state automatically.
        <br />
        <Link href="/privacy" style={styles.footerLink}>
          Privacy Policy
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div style={styles.container}>
      <div style={styles.glowLeft}></div>
      <div style={styles.glowRight}></div>
      <Suspense fallback={<div style={styles.card}><p style={{color: '#94a3b8', textAlign: 'center'}}>Loading authentication interface...</p></div>}>
        <LoginFormContent />
      </Suspense>
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
    background: 'radial-gradient(circle, rgba(79, 70, 229, 0.14) 0%, rgba(0, 0, 0, 0) 70%)',
    top: '10%',
    left: '10%',
    pointerEvents: 'none',
  },
  glowRight: {
    position: 'absolute',
    width: '350px',
    height: '350px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(168, 85, 247, 0.14) 0%, rgba(0, 0, 0, 0) 70%)',
    bottom: '10%',
    right: '10%',
    pointerEvents: 'none',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '16px',
    padding: '40px 32px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    zIndex: 1,
  },
  header: {
    textAlign: 'center',
    marginBottom: '28px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '800',
    color: '#f8fafc',
    margin: '0 0 6px 0',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  errorAlert: {
    backgroundColor: '#450a0a',
    border: '1px solid #991b1b',
    color: '#fca5a5',
    padding: '12px 14px',
    borderRadius: '8px',
    fontSize: '13.5px',
    lineHeight: '1.4',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: '13.5px',
    fontWeight: '600',
    color: '#cbd5e1',
  },
  input: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '11px 14px',
    color: '#f8fafc',
    fontSize: '14.5px',
    outline: 'none',
  },
  button: {
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '13px 20px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '6px',
  },
  buttonDisabled: {
    backgroundColor: '#312e81',
    color: '#94a3b8',
    cursor: 'not-allowed',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    margin: '20px 0',
  },
  dividerText: {
    padding: '0 10px',
    fontSize: '12px',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    width: '100%',
    textAlign: 'center',
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleButton: {
    width: '100%',
    backgroundColor: '#ffffff',
    color: '#1e293b',
    border: 'none',
    borderRadius: '8px',
    padding: '13px 20px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
  },
  googleIcon: {
    display: 'block',
  },
  forgotLink: {
    fontSize: '12.5px',
    color: '#a5b4fc',
    textDecoration: 'none',
  },
  footerNote: {
    fontSize: '12px',
    color: '#64748b',
    textAlign: 'center',
    margin: '24px 0 0 0',
  },
  footerLink: {
    color: '#a5b4fc',
    textDecoration: 'none',
    display: 'inline-block',
    marginTop: '8px',
    transition: 'color 0.2s',
  },
};
