import { z } from "zod";
import { RENTAL_SOURCES, RENTAL_STATUSES } from "./types";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

/** Optional money field: accepts a non-negative number or null/omitted. */
const money = z
  .number()
  .nonnegative()
  .max(1_000_000)
  .nullable()
  .optional();

const optionalText = z.string().trim().max(2000).nullable().optional();
const shortText = z.string().trim().min(1).max(300);

export const adminUnlockSchema = z.object({
  password: z.string().min(1).max(200),
});

export const unitCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex color like #c91818")
    .optional(),
  notes: optionalText,
  active: z.boolean().optional(),
});

export const unitUpdateSchema = unitCreateSchema.partial();

const rentalBase = {
  unit_id: z.string().uuid().nullable().optional(),
  status: z.enum(RENTAL_STATUSES).optional(),
  source: z.enum(RENTAL_SOURCES).optional(),
  customer_name: shortText,
  customer_email: z.string().trim().email().max(300),
  customer_phone: optionalText,
  customer_address: optionalText,
  usage_location: optionalText,
  pickup_date: isoDate,
  pickup_time: optionalText,
  return_date: isoDate,
  daily_rate: money,
  quoted_price: money,
  deposit_amount: money,
  deposit_received: z.boolean().optional(),
  deposit_returned: z.boolean().optional(),
  deposit_returned_amount: money,
  amount_received: money,
  comments: optionalText,
};

export const rentalCreateSchema = z
  .object(rentalBase)
  .refine((d) => d.return_date >= d.pickup_date, {
    message: "Return date must be on or after pickup date",
    path: ["return_date"],
  });

export const rentalUpdateSchema = z
  .object({
    ...rentalBase,
    customer_name: shortText.optional(),
    customer_email: z.string().trim().email().max(300).optional(),
    pickup_date: isoDate.optional(),
    return_date: isoDate.optional(),
    /** Optimistic-concurrency guard: the updated_at the client last saw. */
    expected_updated_at: z.string().optional(),
  })
  .refine(
    (d) =>
      !d.pickup_date || !d.return_date || d.return_date >= d.pickup_date,
    {
      message: "Return date must be on or after pickup date",
      path: ["return_date"],
    },
  );

export const availabilityQuerySchema = z
  .object({
    start: isoDate,
    end: isoDate,
  })
  .refine((d) => d.end >= d.start, {
    message: "end must be on or after start",
    path: ["end"],
  });

export type UnitCreateInput = z.infer<typeof unitCreateSchema>;
export type UnitUpdateInput = z.infer<typeof unitUpdateSchema>;
export type RentalCreateInput = z.infer<typeof rentalCreateSchema>;
export type RentalUpdateInput = z.infer<typeof rentalUpdateSchema>;
