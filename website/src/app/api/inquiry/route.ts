import { NextResponse } from "next/server";
import { z } from "zod";
import { sendEmail } from "@/lib/email";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(7),
  address: z.string().min(5),
  services: z.string().min(3),
  comments: z.string().optional(),
  serviceLabel: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = schema.parse(body);

    await sendEmail({
      subject: "Website Service Inquiry",
      text: [
        `Name: ${data.name}`,
        `Email: ${data.email}`,
        `Phone: ${data.phone}`,
        `Address: ${data.address}`,
        `Inquiry: ${data.services}`,
        data.comments ? `Comments: ${data.comments}` : "",
        data.serviceLabel ? `Form context: ${data.serviceLabel}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
