import nodemailer from "nodemailer";

export function isEmailConfigured(): boolean {
  return !!(process.env.CRM_SMTP_HOST && process.env.CRM_SMTP_USER && process.env.CRM_SMTP_PASS);
}

export async function sendMail({ to, subject, text }: { to: string; subject: string; text: string }) {
  if (!isEmailConfigured()) {
    throw new Error("Email is not configured. Set CRM_SMTP_HOST/USER/PASS or configure it in Settings.");
  }

  const transport = nodemailer.createTransport({
    host: process.env.CRM_SMTP_HOST,
    port: Number(process.env.CRM_SMTP_PORT || 587),
    secure: Number(process.env.CRM_SMTP_PORT) === 465,
    auth: { user: process.env.CRM_SMTP_USER, pass: process.env.CRM_SMTP_PASS },
  });

  await transport.sendMail({
    from: process.env.CRM_SMTP_FROM || process.env.CRM_SMTP_USER,
    to,
    subject,
    text,
  });
}
