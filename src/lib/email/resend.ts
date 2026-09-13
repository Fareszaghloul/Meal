import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
export const resend = resendApiKey ? new Resend(resendApiKey) : null;

const DEFAULT_FROM = process.env.EMAIL_FROM || "MealPrep <onboarding@resend.dev>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn("[Email Service] Resend API key is not configured. Email not sent.");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: DEFAULT_FROM,
      to,
      subject,
      html,
    });

    if (error) {
      console.error("[Email Service] Error sending email via Resend:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("[Email Service] Unexpected error:", err);
    return { success: false, error: err?.message || "Failed to send email" };
  }
}

/**
 * Sends an email verification link
 */
export async function sendVerificationEmail(to: string, displayName: string, token: string) {
  const verifyUrl = `${APP_URL}/verify-email?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
          .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
          .header { text-align: center; margin-bottom: 24px; }
          .logo-badge { display: inline-block; background: #16a34a; color: white; padding: 8px 16px; border-radius: 12px; font-weight: bold; font-size: 16px; }
          h1 { font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 16px; margin-bottom: 8px; }
          p { font-size: 14px; line-height: 1.6; color: #475569; margin: 12px 0; }
          .btn-wrapper { text-align: center; margin: 28px 0; }
          .btn { display: inline-block; background-color: #16a34a; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-size: 14px; font-weight: 600; }
          .footer { font-size: 12px; color: #94a3b8; text-align: center; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
          .url-fallback { word-break: break-all; font-family: monospace; font-size: 12px; color: #64748b; background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo-badge">MealPrep</div>
            <h1>Verify your email address</h1>
          </div>
          <p>Hi ${displayName || "there"},</p>
          <p>Thanks for joining MealPrep! Please click the button below to verify your email address and secure your account.</p>
          <div class="btn-wrapper">
            <a href="${verifyUrl}" class="btn" target="_blank">Verify Email Address</a>
          </div>
          <p>If the button above does not work, copy and paste this link into your web browser:</p>
          <div class="url-fallback">${verifyUrl}</div>
          <p>This verification link will expire in 24 hours.</p>
          <div class="footer">
            If you didn't create an account with MealPrep, you can safely ignore this email.
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: "Verify your email — MealPrep",
    html,
  });
}

/**
 * Sends a password reset email
 */
export async function sendPasswordResetEmail(to: string, displayName: string, token: string) {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
          .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
          .header { text-align: center; margin-bottom: 24px; }
          .logo-badge { display: inline-block; background: #16a34a; color: white; padding: 8px 16px; border-radius: 12px; font-weight: bold; font-size: 16px; }
          h1 { font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 16px; margin-bottom: 8px; }
          p { font-size: 14px; line-height: 1.6; color: #475569; margin: 12px 0; }
          .btn-wrapper { text-align: center; margin: 28px 0; }
          .btn { display: inline-block; background-color: #16a34a; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-size: 14px; font-weight: 600; }
          .footer { font-size: 12px; color: #94a3b8; text-align: center; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
          .url-fallback { word-break: break-all; font-family: monospace; font-size: 12px; color: #64748b; background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo-badge">MealPrep</div>
            <h1>Reset your password</h1>
          </div>
          <p>Hi ${displayName || "there"},</p>
          <p>We received a request to reset the password for your MealPrep account. Click the button below to choose a new password:</p>
          <div class="btn-wrapper">
            <a href="${resetUrl}" class="btn" target="_blank">Reset Password</a>
          </div>
          <p>If you did not request a password reset, you can safely ignore this email. Your password will not change until you access the link above.</p>
          <div class="url-fallback">${resetUrl}</div>
          <p>This link is single-use and will expire in 1 hour.</p>
          <div class="footer">
            MealPrep Security Team
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: "Reset your password — MealPrep",
    html,
  });
}
