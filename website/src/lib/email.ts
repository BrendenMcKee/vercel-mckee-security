type EmailPayload = {
  subject: string;
  text: string;
  html?: string;
};

export async function sendEmail(payload: EmailPayload) {
  const to = process.env.CONTACT_EMAIL ?? "info@mckeesecurity.ca";
  const apiKey = process.env.RESEND_API_KEY;

  if (apiKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "McKee Security <onboarding@resend.dev>",
        to: [to],
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Email failed: ${err}`);
    }
    return;
  }

  console.info("[email]", payload.subject, payload.text.slice(0, 200));
}
