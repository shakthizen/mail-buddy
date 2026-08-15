import nodemailer from 'nodemailer';
import { getSmtpConfig } from '../lib/appSettings';
import { env } from '../env';

export function createTransport() {
  const smtp = getSmtpConfig();
  if (!smtp.host) {
    throw new Error('SMTP is not configured yet - configure it in Settings > SMTP before sending email');
  }
  return nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.user ? { user: smtp.user, pass: smtp.password } : undefined,
  });
}

export function getFromAddress() {
  const smtp = getSmtpConfig();
  if (smtp.fromAddress) {
    if (smtp.fromName) {
      return `"${smtp.fromName}" <${smtp.fromAddress}>`;
    }
    return smtp.fromAddress;
  }
  return env.SMTP_FROM || smtp.user;
}

export async function sendMail(options: { to: string; subject: string; html: string; from?: string }) {
  const transport = createTransport();
  return transport.sendMail({
    from: options.from || getFromAddress(),
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
}

export async function verifySmtpConnection(): Promise<{ ok: boolean; message?: string }> {
  try {
    const transport = createTransport();
    await transport.verify();
    return { ok: true };
  } catch (err: any) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function sendTestEmail(to: string): Promise<{ success: boolean; messageId?: string }> {
  const smtp = getSmtpConfig();
  const timestamp = new Date().toLocaleString();
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #7c3aed; margin: 0; font-size: 24px;">Mail Buddy</h1>
        <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">SMTP Verification Test</p>
      </div>
      <div style="background-color: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <p style="color: #5b21b6; font-weight: 600; margin: 0 0 8px 0;">🎉 SMTP Connection Successful!</p>
        <p style="color: #4c1d95; font-size: 13px; margin: 0;">
          This test email confirms that Mail Buddy is successfully connected to your SMTP server and authorized to deliver emails.
        </p>
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px; color: #4b5563; margin-bottom: 20px;">
        <tr>
          <td style="padding: 6px 0; font-weight: 600; width: 120px;">SMTP Host:</td>
          <td style="padding: 6px 0; font-family: monospace;">${smtp.host}:${smtp.port}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: 600;">Secure (TLS):</td>
          <td style="padding: 6px 0;">${smtp.secure ? 'Yes (TLS)' : 'No (STARTTLS / Plain)'}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: 600;">From Header:</td>
          <td style="padding: 6px 0;">${getFromAddress()}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: 600;">Sent Timestamp:</td>
          <td style="padding: 6px 0;">${timestamp}</td>
        </tr>
      </table>
      <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; text-align: center; font-size: 11px; color: #9ca3af;">
        Sent via Mail Buddy — Self-hosted Email Template Manager & Delivery API
      </div>
    </div>
  `;

  const result = await sendMail({
    to,
    subject: 'Mail Buddy — SMTP Test Email',
    html,
  });

  return { success: true, messageId: result.messageId };
}

