import { NextResponse } from "next/server";
import {
  applySourceLabels,
  buildFormEmailHtml,
  buildFormEmailSubject,
  buildFormEmailText,
} from "@/lib/email-templates";
import { sendEmail } from "@/lib/email";

const fieldLabels: Record<string, string> = {
  firstName: "First Name",
  lastName: "Last Name",
  email: "Email",
  phone: "Phone",
  address: "Address",
  city: "City",
  province: "Province",
  postalCode: "Postal Code",
  source: "How They Found Us",
  sourceOther: "Other Source Details",
  additionalInfo: "Additional Information",
};

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const orderedKeys = [
      "firstName",
      "lastName",
      "email",
      "phone",
      "address",
      "city",
      "province",
      "postalCode",
      "source",
      "sourceOther",
      "additionalInfo",
    ] as const;

    const values: Record<string, string> = {};
    for (const key of orderedKeys) {
      const val = form.get(key);
      if (val && typeof val === "string" && val.trim()) {
        values[key] = val.trim();
      }
    }

    const firstName = values.firstName ?? "";
    const lastName = values.lastName ?? "";
    const applicantName = `${firstName} ${lastName}`.trim() || "New Applicant";
    const email = values.email;

    const fields = orderedKeys
      .filter((key) => values[key])
      .map((key) => {
        let value = values[key];
        if (key === "source") {
          value = applySourceLabels[value] ?? value;
        }

        const field = {
          label: fieldLabels[key] ?? key,
          value,
          highlight: key === "additionalInfo",
        };

        if (key === "email") {
          return { ...field, href: `mailto:${value}` };
        }
        if (key === "phone") {
          return { ...field, href: `tel:${value.replace(/\s/g, "")}` };
        }

        return field;
      });

    const resume = form.get("resume");
    let attachments;
    if (resume instanceof File && resume.size > 0) {
      const buffer = Buffer.from(await resume.arrayBuffer());
      attachments = [
        {
          filename: resume.name,
          content: buffer.toString("base64"),
        },
      ];
      fields.push({
        label: "Resume",
        value: `${resume.name} (attached)`,
        highlight: false,
      });
    }

    const payload = { kind: "apply" as const, fields };

    await sendEmail({
      subject: buildFormEmailSubject("apply", applicantName),
      text: buildFormEmailText(payload),
      html: buildFormEmailHtml(payload),
      replyTo: email,
      attachments,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
