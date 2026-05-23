import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || 'VoiceTranslate <noreply@y-tvoctrans.vercel.app>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://y-tvoctrans.vercel.app';

export async function sendVerificationEmail(email, token) {
  const verifyUrl = `${APP_URL}/api/auth/verify?token=${token}`;
  const subject = 'Verify your VoiceTranslate email';
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1f2937;">
      <h2 style="color: #4f46e5;">Welcome to VoiceTranslate!</h2>
      <p>Please verify your email address to activate your account and start your trial.</p>
      <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0;">Verify Email</a>
      <p>If the button doesn't work, you can also copy and paste the link below into your browser:</p>
      <p><a href="${verifyUrl}" style="color: #4f46e5;">${verifyUrl}</a></p>
      <p>If you didn't create an account, you can safely ignore this email.</p>
    </div>
  `;

  if (!resend) {
    console.log('==================================================');
    console.log(`[Email Sandbox] Verification Email sent to: ${email}`);
    console.log(`[Email Sandbox] Subject: ${subject}`);
    console.log(`[Email Sandbox] Verification Link: ${verifyUrl}`);
    console.log('==================================================');
    return { success: true, sandbox: true };
  }

  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject,
      html,
    });
    return { success: true, id: data.id };
  } catch (error) {
    console.error('[Email Error] Failed to send verification email:', error);
    throw error;
  }
}

export async function sendPasswordResetEmail(email, token) {
  const resetUrl = `${APP_URL}/auth/reset-password?token=${token}`;
  const subject = 'Reset your VoiceTranslate password';
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1f2937;">
      <h2 style="color: #4f46e5;">Reset your Password</h2>
      <p>You requested a password reset for your VoiceTranslate account.</p>
      <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0;">Reset Password</a>
      <p>If the button doesn't work, copy and paste the link below into your browser:</p>
      <p><a href="${resetUrl}" style="color: #4f46e5;">${resetUrl}</a></p>
      <p>This link is valid for 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
    </div>
  `;

  if (!resend) {
    console.log('==================================================');
    console.log(`[Email Sandbox] Password Reset Email sent to: ${email}`);
    console.log(`[Email Sandbox] Subject: ${subject}`);
    console.log(`[Email Sandbox] Reset Link: ${resetUrl}`);
    console.log('==================================================');
    return { success: true, sandbox: true };
  }

  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject,
      html,
    });
    return { success: true, id: data.id };
  } catch (error) {
    console.error('[Email Error] Failed to send reset email:', error);
    throw error;
  }
}
