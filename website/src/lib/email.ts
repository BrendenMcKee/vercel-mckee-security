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
};

export async function sendEmail(payload: EmailPayload) {
  const to = process.env.CONTACT_EMAIL ?? "info@mckeesecurity.ca";
  const apiKey = process.env.RESEND_API_KEY;

  if (apiKey) {
    const body: Record<string, unknown> = {
      from: process.env.EMAIL_FROM ?? "McKee Security <onboarding@resend.dev>",
      to: [to],
      subject: payload.subject,
      text: payload.text,
    };

    if (payload.html) body.html = payload.html;
    if (payload.replyTo) body.reply_to = payload.replyTo;
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
    return;
  }

  console.info("[email]", payload.subject, payload.text.slice(0, 200));
}
