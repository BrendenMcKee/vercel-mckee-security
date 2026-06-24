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

const rentalTimeSchema = z.enum(RENTAL_PICKUP_TIME_SLOTS);

const inquirySchema = z
  .object({
    name: z.string().min(2),
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
      if (!data.pickupTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["pickupTime"],
          message: "Pickup time is required",
        });
      }
      if (data.pickupDate && !isWeekdayIso(data.pickupDate)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["pickupDate"],
          message: "Pickup must be a weekday (Monday to Friday)",
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = inquirySchema.parse(body);
    const isStarlinkRental = data.serviceSlug === "starlink-rental";
    const servicesRequested =
      data.services?.trim() ||
      (isStarlinkRental ? "Starlink Gen2 Rental (Roam Max included)" : "");

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
