import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const fields = [
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

    const lines: string[] = ["New job application received:", ""];
    for (const key of fields) {
      const val = form.get(key);
      if (val && typeof val === "string") lines.push(`${key}: ${val}`);
    }

    const resume = form.get("resume");
    if (resume instanceof File) {
      lines.push("", `Resume: ${resume.name} (${resume.size} bytes)`);
    }

    await sendEmail({
      subject: "Website Job Application",
      text: lines.join("\n"),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
