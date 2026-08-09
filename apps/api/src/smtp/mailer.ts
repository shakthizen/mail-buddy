import nodemailer from 'nodemailer';
import { getSmtpConfig } from '../lib/appSettings';
import { env } from '../env';

export function createTransport() {
  const smtp = getSmtpConfig();
  if (!smtp.host) {
    throw new Error('SMTP is not configured yet - set it via PUT /api/settings before sending email');
  }
  return nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.user ? { user: smtp.user, pass: smtp.password } : undefined,
  });
}

export async function sendMail(options: { to: string; subject: string; html: string }) {
  const transport = createTransport();
  return transport.sendMail({
    from: env.SMTP_FROM || getSmtpConfig().user,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
}
