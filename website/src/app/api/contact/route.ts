import { NextResponse } from "next/server";
import { z } from "zod";
import {
  buildFormEmailHtml,
  buildFormEmailSubject,
  buildFormEmailText,
} from "@/lib/email-templates";
import { sendEmail } from "@/lib/email";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  subject: z.string().min(2),
  message: z.string().min(10),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = schema.parse(body);

    const fields = [
      { label: "Name", value: data.name },
      {
        label: "Email",
        value: data.email,
        href: `mailto:${data.email}`,
      },
      { label: "Subject", value: data.subject },
      { label: "Message", value: data.message, highlight: true },
    ];

    const payload = { kind: "contact" as const, fields };

    await sendEmail({
      subject: buildFormEmailSubject("contact", data.subject),
      text: buildFormEmailText(payload),
      html: buildFormEmailHtml(payload),
      replyTo: data.email,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
