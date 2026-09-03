// Уведомления владельцу по email через SMTP (Yandex Почта — российская
// инфраструктура, без риска блокировки, в отличие от Telegram API).
// Серверный код, никогда не импортируется в клиентские компоненты.
import nodemailer from "nodemailer";

let cachedTransporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function transporter() {
  if (cachedTransporter) return cachedTransporter;
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    throw new Error("Missing SMTP_HOST/SMTP_USER/SMTP_PASS env vars");
  }
  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return cachedTransporter;
}

export async function sendNotificationEmail(subject: string, text: string, html?: string) {
  const user = process.env.SMTP_USER;
  const to = process.env.SMTP_TO || user;
  await transporter().sendMail({ from: user, to, subject, text, html });
}
