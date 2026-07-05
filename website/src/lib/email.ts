import { randomUUID } from "crypto";

type EmailAttachment = {
  filename: string;
  content: string;
};

type EmailPayload = {
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
  headers?: Record<string, string>;
  /** Recipient override (portal emails). Defaults to CONTACT_EMAIL: existing site forms are unaffected. */
  to?: string | string[];
  cc?: string | string[];
};

/**
 * Sends an email via Resend. Returns `true` only when a message was actually
 * dispatched. When `RESEND_API_KEY` is missing it logs and returns `false` so
 * callers can decide how to handle an undelivered notification (rather than
 * silently treating a no-op as success).
 */
export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const to = payload.to ?? process.env.CONTACT_EMAIL ?? "info@mckeesecurity.ca";
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn(
      "[email] RESEND_API_KEY is not set; email NOT sent:",
      payload.subject,
    );
    return false;
  }

  const body: Record<string, unknown> = {
    from: process.env.EMAIL_FROM ?? "McKee Security <onboarding@resend.dev>",
    to: Array.isArray(to) ? to : [to],
    subject: payload.subject,
    text: payload.text,
    // A unique reference id stops Gmail from collapsing same-subject notifications
    // into one thread (and deferring the apparent duplicate), so every submission
    // lands as its own message that arrives promptly.
    headers: {
      "X-Entity-Ref-ID": randomUUID(),
      ...payload.headers,
    },
  };

  if (payload.html) body.html = payload.html;
  if (payload.replyTo) body.reply_to = payload.replyTo;
  if (payload.cc) body.cc = Array.isArray(payload.cc) ? payload.cc : [payload.cc];
  if (payload.attachments?.length) body.attachments = payload.attachments;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Email failed: ${err}`);
  }
  return true;
}
