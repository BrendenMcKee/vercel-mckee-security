import { NextResponse } from "next/server";
import { z } from "zod";
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

    await sendEmail({
      subject: `Website Contact: ${data.subject}`,
      text: [
        `Name: ${data.name}`,
        `Email: ${data.email}`,
        `Subject: ${data.subject}`,
        "",
        data.message,
      ].join("\n"),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
