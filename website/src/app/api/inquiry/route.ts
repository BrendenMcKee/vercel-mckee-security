import { NextResponse } from "next/server";
import { z } from "zod";
import {
  buildFormEmailHtml,
  buildFormEmailSubject,
  buildFormEmailText,
} from "@/lib/email-templates";
import { getServiceDisplayName } from "@/lib/form-email-meta";
import { sendEmail } from "@/lib/email";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(7),
  address: z.string().min(5),
  services: z.string().min(3),
  comments: z.string().optional(),
  serviceLabel: z.string().optional(),
  serviceSlug: z.string().optional(),
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
      {
        label: "Phone",
        value: data.phone,
        href: `tel:${data.phone.replace(/\s/g, "")}`,
      },
      { label: "Address", value: data.address },
      {
        label: "Service Area",
        value: getServiceDisplayName(data.serviceSlug),
      },
      { label: "Services Requested", value: data.services, highlight: true },
      ...(data.comments
        ? [{ label: "Additional Comments", value: data.comments }]
        : []),
    ];

    const payload = {
      kind: "inquiry" as const,
      fields,
      serviceSlug: data.serviceSlug,
    };

    await sendEmail({
      subject: buildFormEmailSubject("inquiry", data.name, data.serviceSlug),
      text: buildFormEmailText(payload),
      html: buildFormEmailHtml(payload),
      replyTo: data.email,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
