import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  buildFormEmailHtml,
  buildFormEmailSubject,
  buildFormEmailText,
} from "@/lib/email-templates";
import { getServiceDisplayName } from "@/lib/form-email-meta";
import {
  formatRentalReturnDate,
  formatRentalSchedule,
  isWeekdayIso,
  RENTAL_PICKUP_TIME_SLOTS,
} from "@/lib/inquiry-dates";
import { sendEmail } from "@/lib/email";
import { siteConfig } from "@/lib/site-config";
import {
  getSupabaseAdmin,
  isSupabaseConfigured,
} from "@/lib/starlink/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const rentalTimeSchema = z.enum(RENTAL_PICKUP_TIME_SLOTS);

const inquirySchema = z
  .object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(7),
    address: z.string().min(5),
    services: z.string().optional(),
    comments: z.string().optional(),
    serviceLabel: z.string().optional(),
    serviceSlug: z.string().optional(),
    pickupDate: z.string().optional(),
    pickupTime: rentalTimeSchema.optional(),
    returnDate: z.string().optional(),
    usageLocation: z.string().optional(),
    // Honeypot: real users never see/fill this. Bots often do. Named neutrally
    // (not "company"/"organization") so browser autofill never populates it and
    // wrongly flags a genuine submission as spam.
    hp_field: z.string().optional(),
    // Back-compat: tolerate the old honeypot key from any cached client without
    // treating its (often autofilled) value as a spam signal.
    company: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const isStarlinkRental = data.serviceSlug === "starlink-rental";

    if (isStarlinkRental) {
      if (!data.pickupDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["pickupDate"],
          message: "Pickup date is required",
        });
      }
      if (!data.returnDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["returnDate"],
          message: "Return date is required",
        });
      }
      if (data.pickupDate && !isWeekdayIso(data.pickupDate)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["pickupDate"],
          message: "Pickup must be a weekday (Monday to Friday)",
        });
      }
      if (!data.pickupTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["pickupTime"],
          message: "Approximate pickup time is required",
        });
      }
      if (!data.usageLocation || data.usageLocation.trim().length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["usageLocation"],
          message: "Usage location is required",
        });
      }
      if (
        data.pickupDate &&
        data.returnDate &&
        data.returnDate < data.pickupDate
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["returnDate"],
          message: "Return date must be on or after pickup date",
        });
      }
      return;
    }

    if (!data.services || data.services.trim().length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["services"],
        message: "Services requested is required",
      });
    }
  });

type InquiryData = z.infer<typeof inquirySchema>;

/** Combine the split name fields into a single display name. */
function fullName(data: InquiryData): string {
  return `${data.firstName} ${data.lastName}`.replace(/\s+/g, " ").trim();
}

/**
 * Best-effort durable capture of a website rental request. Returns the rental id
 * when a row exists (either newly inserted or an identical recent one already on
 * file), or null on failure. The new row is always `requested`, which is visible
 * in the admin portal but never blocks availability until an admin confirms it.
 * Never throws: the inquiry email is the fallback path.
 */
async function tryWriteRequestedRental(data: InquiryData): Promise<string | null> {
  if (!data.pickupDate || !data.returnDate) return null;
  try {
    const supabase = getSupabaseAdmin();

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: existing } = await supabase
      .from("rentals")
      .select("id")
      .eq("customer_email", data.email)
      .eq("pickup_date", data.pickupDate)
      .eq("return_date", data.returnDate)
      .eq("status", "requested")
      .gte("created_at", tenMinutesAgo)
      .limit(1);

    if (existing && existing.length > 0) return existing[0].id;

    const { data: inserted, error } = await supabase
      .from("rentals")
      .insert({
        status: "requested",
        source: "website",
        customer_name: fullName(data),
        customer_email: data.email,
        customer_phone: data.phone ?? null,
        customer_address: data.address ?? null,
        usage_location: data.usageLocation ?? null,
        pickup_date: data.pickupDate,
        pickup_time: data.pickupTime ?? null,
        return_date: data.returnDate,
        comments: data.comments ?? null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[inquiry] rental write failed", error.message);
      return null;
    }
    return inserted.id;
  } catch (err) {
    console.error("[inquiry] rental write threw", err);
    return null;
  }
}

export async function POST(request: Request) {
  const reqId = randomUUID().slice(0, 8);
  let data: InquiryData;
  try {
    const body = await request.json();
    // Log the raw shape (not full values) so we can see what the browser sent.
    console.log(`[inquiry ${reqId}] received`, {
      serviceSlug: body?.serviceSlug,
      hasFirstName: Boolean(body?.firstName),
      hasLastName: Boolean(body?.lastName),
      hasEmail: Boolean(body?.email),
      hasPhone: Boolean(body?.phone),
      hasAddress: Boolean(body?.address),
      pickupDate: body?.pickupDate ?? null,
      returnDate: body?.returnDate ?? null,
      pickupTime: body?.pickupTime ?? null,
      hasUsageLocation: Boolean(body?.usageLocation),
      honeypotFilled: Boolean(body?.hp_field && String(body.hp_field).trim()),
      honeypotValue: body?.hp_field ?? null,
      legacyCompanyValue: body?.company ?? null,
    });
    data = inquirySchema.parse(body);
  } catch (err) {
    const issues =
      err instanceof z.ZodError ? err.flatten().fieldErrors : String(err);
    console.warn(`[inquiry ${reqId}] validation failed`, issues);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Honeypot: bots fill this hidden field. Silently accept and drop. Only the
  // neutrally-named field counts; the legacy "company" key is intentionally not
  // a spam signal because browser autofill used to populate it.
  if (data.hp_field && data.hp_field.trim().length > 0) {
    console.warn(
      `[inquiry ${reqId}] honeypot triggered (hp_field="${data.hp_field}") — dropping as spam`,
    );
    return NextResponse.json({ ok: true });
  }

  const isStarlinkRental = data.serviceSlug === "starlink-rental";
  const customerName = fullName(data);

  // For Starlink rentals, durably capture the lead first (primary path).
  let rentalId: string | null = null;
  if (isStarlinkRental && isSupabaseConfigured()) {
    rentalId = await tryWriteRequestedRental(data);
  } else if (isStarlinkRental) {
    console.warn(
      `[inquiry ${reqId}] Supabase not configured; skipping rental write`,
    );
  }
  const rentalWritten = Boolean(rentalId);
  if (isStarlinkRental) {
    console.log(
      `[inquiry ${reqId}] rental write ${rentalWritten ? `ok (id ${rentalId})` : "FAILED"}`,
    );
  }

  const baseUrl = siteConfig.url.replace(/\/$/, "");
  const adminUrl = rentalId
    ? `${baseUrl}/starlink-admin?rental=${rentalId}`
    : `${baseUrl}/starlink-admin`;

  const servicesRequested =
    data.services?.trim() ||
    (isStarlinkRental ? "Starlink Gen2 Rental (Roam Max included)" : "");

  const fields = [
      ...(isStarlinkRental
        ? [
            {
              label: "Admin action",
              value:
                "Open this request in the admin portal to set pricing, confirm, and lock in the dates. Nothing is reserved until you confirm.",
              href: adminUrl,
              buttonLabel: "Review & confirm rental",
              cta: true,
            },
          ]
        : []),
      { label: "Name", value: customerName },
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
      ...(data.pickupDate
        ? [
            {
              label: "Preferred Pickup",
              value: formatRentalSchedule(data.pickupDate, data.pickupTime),
              highlight: true,
            },
          ]
        : []),
      ...(data.returnDate
        ? [
            {
              label: "Preferred Return",
              value: formatRentalReturnDate(data.returnDate),
              highlight: true,
            },
          ]
        : []),
      ...(isStarlinkRental && data.pickupDate && !data.pickupTime
        ? [
            {
              label: "Schedule Note",
              value:
                "Approximate pickup time was not selected. Confirm pickup time with the customer before booking.",
              highlight: true,
            },
          ]
        : []),
      ...(data.usageLocation
        ? [{ label: "Where Kit Will Be Used", value: data.usageLocation, highlight: true }]
        : []),
      { label: "Services Requested", value: servicesRequested, highlight: true },
      ...(data.comments
        ? [{ label: "Additional Comments", value: data.comments }]
        : []),
    ];

  const payload = {
    kind: "inquiry" as const,
    fields,
    serviceSlug: data.serviceSlug,
  };

  // Email and the durable DB write are independent capture channels. The request
  // only succeeds if the lead landed somewhere we'll actually see it.
  let emailSent = false;
  try {
    emailSent = await sendEmail({
      subject: buildFormEmailSubject("inquiry", customerName, data.serviceSlug),
      text: buildFormEmailText(payload),
      html: buildFormEmailHtml(payload),
      replyTo: data.email,
    });
  } catch (err) {
    console.error(`[inquiry ${reqId}] email failed`, err);
  }

  console.log(
    `[inquiry ${reqId}] outcome: emailSent=${emailSent} rentalWritten=${rentalWritten}`,
  );

  if (!emailSent && !rentalWritten) {
    console.error(
      `[inquiry ${reqId}] BOTH channels failed — returning 502 to client`,
    );
    return NextResponse.json(
      { error: "Could not submit your request. Please call (705) 457-2156." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
