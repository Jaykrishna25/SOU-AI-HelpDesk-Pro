"use client";
const SERVICE = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
const TEMPLATE = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;
const NOTIFY_EMAIL = process.env.NEXT_PUBLIC_NOTIFY_EMAIL;

export function emailEnabled(): boolean {
  return Boolean(SERVICE && TEMPLATE && PUBLIC_KEY && NOTIFY_EMAIL);
}

export async function sendMail(subject: string, message: string, forWhom = "") {
  if (!emailEnabled() || typeof window === "undefined") return;
  try {
    await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: SERVICE,
        template_id: TEMPLATE,
        user_id: PUBLIC_KEY,
        template_params: {
          to_email: NOTIFY_EMAIL,
          to_name: forWhom || "SOU User",
          subject: "[SOU HelpDesk] " + subject,
          message: (forWhom ? "Recipient: " + forWhom + "\n\n" : "") + message,
        },
      }),
    });
  } catch {}
}
