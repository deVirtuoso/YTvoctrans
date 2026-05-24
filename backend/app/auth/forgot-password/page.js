'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setStatus('error');
      setMessage('Email address is required.');
      return;
    }
    setStatus('submitting');
    setMessage('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to request password reset');
      }
      setStatus('success');
      setMessage(
        data.message ||
          'If that email exists, a password reset link has been sent. Check your inbox.'
      );
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.glowLeft}></div>
      <div style={styles.glowRight}></div>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>Forgot Password</h1>
          <p style={styles.subtitle}>
            Enter your account email and we&apos;ll send you a reset link.
          </p>
        </div>

        {status === 'success' ? (
          <div style={styles.successContainer}>
            <div style={styles.badgeSuccess}>Check your inbox</div>
            <p style={styles.successText}>{message}</p>
            <p style={styles.hint}>
              The link is valid for 1 hour. You can close this tab once you&apos;ve reset your password.
            </p>
            <Link href="/auth/login" style={styles.backLink}>
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form}>
            {status === 'error' && (
              <div style={styles.errorAlert} role="alert">
                {message}
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

            <button
              type="submit"
              style={{
                ...styles.button,
                ...(status === 'submitting' ? styles.buttonDisabled : {}),
              }}
              disabled={status === 'submitting'}
            >
              {status === 'submitting' ? 'Sending...' : 'Send reset link'}
            </button>

            <Link href="/auth/login" style={styles.backLink}>
              Back to sign in
            </Link>
          </form>
        )}
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
  header: { textAlign: 'center', marginBottom: '28px' },
  title: {
    fontSize: '28px',
    fontWeight: '800',
    color: '#f8fafc',
    margin: '0 0 8px 0',
    letterSpacing: '-0.5px',
  },
  subtitle: { fontSize: '14px', color: '#94a3b8', margin: 0, lineHeight: '1.5' },
  form: { display: 'flex', flexDirection: 'column', gap: '18px' },
  errorAlert: {
    backgroundColor: '#450a0a',
    border: '1px solid #991b1b',
    color: '#fca5a5',
    padding: '12px 14px',
    borderRadius: '8px',
    fontSize: '13.5px',
    lineHeight: '1.4',
  },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13.5px', fontWeight: '600', color: '#cbd5e1' },
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
  backLink: {
    display: 'block',
    textAlign: 'center',
    fontSize: '13.5px',
    color: '#a5b4fc',
    textDecoration: 'none',
    marginTop: '12px',
  },
  successContainer: { textAlign: 'center', padding: '10px 0' },
  badgeSuccess: {
    display: 'inline-block',
    padding: '6px 16px',
    backgroundColor: '#064e3b',
    color: '#34d399',
    fontWeight: '700',
    borderRadius: '9999px',
    fontSize: '13px',
    marginBottom: '20px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  successText: {
    fontSize: '15px',
    color: '#e2e8f0',
    margin: '0 0 16px 0',
    lineHeight: '1.5',
  },
  hint: {
    fontSize: '13px',
    color: '#94a3b8',
    lineHeight: '1.6',
    margin: '0 0 24px 0',
  },
};
