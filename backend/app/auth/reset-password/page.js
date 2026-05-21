'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function ResetPasswordFormContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle', 'submitting', 'success', 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid reset link. Missing validation token.');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      setStatus('error');
      setMessage('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setStatus('error');
      setMessage('Passwords do not match.');
      return;
    }

    setStatus('submitting');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }
      setStatus('success');
      setMessage('Your password has been successfully reset.');
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'An unexpected error occurred.');
    }
  };

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h1 style={styles.title}>Reset Password</h1>
        <p style={styles.subtitle}>Enter your new password below</p>
      </div>

      {status === 'success' ? (
        <div style={styles.successContainer}>
          <div style={styles.badgeSuccess}>Verified</div>
          <p style={styles.successText}>{message}</p>
          <p style={styles.hint}>You can now close this tab, open the Chrome Extension, and log in with your new password.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={styles.form}>
          {status === 'error' && (
            <div style={styles.errorAlert} role="alert">
              {message}
            </div>
          )}

          <div style={styles.field}>
            <label style={styles.label}>New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="At least 6 characters"
              required
              disabled={status === 'submitting' || !token}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={styles.input}
              placeholder="Repeat new password"
              required
              disabled={status === 'submitting' || !token}
            />
          </div>

          <button
            type="submit"
            style={{
              ...styles.button,
              ...(status === 'submitting' || !token ? styles.buttonDisabled : {}),
            }}
            disabled={status === 'submitting' || !token}
          >
            {status === 'submitting' ? 'Resetting...' : 'Update Password'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div style={styles.container}>
      <div style={styles.glowLeft}></div>
      <div style={styles.glowRight}></div>
      <Suspense fallback={<div style={styles.card}><p style={{color: '#94a3b8', textAlign: 'center'}}>Loading password reset form...</p></div>}>
        <ResetPasswordFormContent />
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
    background: 'radial-gradient(circle, rgba(79, 70, 229, 0.15) 0%, rgba(0, 0, 0, 0) 70%)',
    top: '10%',
    left: '10%',
    pointerEvents: 'none',
  },
  glowRight: {
    position: 'absolute',
    width: '350px',
    height: '350px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(168, 85, 247, 0.15) 0%, rgba(0, 0, 0, 0) 70%)',
    bottom: '10%',
    right: '10%',
    pointerEvents: 'none',
  },
  card: {
    width: '100%',
    maxWidth: '440px',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '16px',
    padding: '40px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    zIndex: 1,
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '800',
    color: '#f8fafc',
    margin: '0 0 8px 0',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '15px',
    color: '#94a3b8',
    margin: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  errorAlert: {
    backgroundColor: '#451a03',
    border: '1px solid #78350f',
    color: '#fcd34d',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    lineHeight: '1.5',
  },
  successContainer: {
    textAlign: 'center',
    padding: '10px 0',
  },
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
    fontSize: '18px',
    fontWeight: '600',
    color: '#34d399',
    margin: '0 0 16px 0',
  },
  hint: {
    fontSize: '14px',
    color: '#94a3b8',
    lineHeight: '1.6',
    margin: 0,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#cbd5e1',
  },
  input: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '12px 16px',
    color: '#f8fafc',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  button: {
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '14px 20px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s, transform 0.1s',
    marginTop: '10px',
  },
  buttonDisabled: {
    backgroundColor: '#312e81',
    color: '#94a3b8',
    cursor: 'not-allowed',
  },
};
