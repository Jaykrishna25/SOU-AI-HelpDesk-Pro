"use client";
const SERVICE = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
const TEMPLATE = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;
const NOTIFY_EMAIL = process.env.NEXT_PUBLIC_NOTIFY_EMAIL;

export function emailEnabled(): boolean {
  return Boolean(SERVICE && TEMPLATE && PUBLIC_KEY);
}

async function post(toEmail: string, toName: string, subject: string, message: string): Promise<boolean> {
  if (!emailEnabled() || !toEmail || typeof window === "undefined") return false;
  try {
    const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: SERVICE,
        template_id: TEMPLATE,
        user_id: PUBLIC_KEY,
        template_params: { to_email: toEmail, to_name: toName, subject: "[SOU HelpDesk] " + subject, message },
      }),
    });
    return res.ok;
  } catch { return false; }
}

export async function sendMail(subject: string, message: string, forWhom = ""): Promise<boolean> {
  if (!NOTIFY_EMAIL) return false;
  return post(NOTIFY_EMAIL, forWhom || "SOU User", subject, (forWhom ? "Recipient: " + forWhom + "\n\n" : "") + message);
}

export async function sendMailTo(toEmail: string, subject: string, message: string): Promise<boolean> {
  return post(toEmail, toEmail, subject, message);
}
