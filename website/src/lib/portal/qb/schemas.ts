import "server-only";

import { z } from "zod";

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD.");

const optionalIsoDate = z
  .union([isoDate, z.literal(""), z.null()])
  .optional()
  .transform((value) => (value ? value : null));

const cents = z.coerce.number().int();
const text = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) =>
  z
    .union([text(max), z.literal(""), z.null()])
    .optional()
    .transform((value) => {
      if (value == null || value === "") return null;
      return value;
    });

export const qbHeartbeatSchema = z.object({
  company_file: optionalText(500),
  company_name: optionalText(240),
  qb_version: optionalText(80),
  error: optionalText(2000),
});

export const qbPollBodySchema = qbHeartbeatSchema.partial();

export const qbReportBodySchema = qbHeartbeatSchema.extend({
  results: z.array(z.unknown()).max(50).optional(),
});

const lineItemSchema = z
  .object({
    name: optionalText(200),
    amount_cents: cents.nullable().optional(),
    quantity: z.coerce.number().nullable().optional(),
    class: optionalText(120),
    tax_code: optionalText(40),
  })
  .strip();

export const qbCustomerRowSchema = z.object({
  list_id: text(64).min(1),
  edit_sequence: text(64).min(1),
  name: text(500).min(1),
  company_name: optionalText(240),
  email: optionalText(320),
  phone: optionalText(64),
  is_active: z.boolean().optional().default(true),
  parent_list_id: optionalText(64),
  balance_cents: cents.optional().default(0),
});

export const qbInvoiceRowSchema = z.object({
  txn_id: text(64).min(1),
  edit_sequence: text(64).min(1),
  customer_list_id: text(64).min(1),
  ref_number: optionalText(64),
  txn_date: isoDate,
  due_on: optionalIsoDate,
  amount_cents: cents,
  subtotal_cents: cents.nullable().optional(),
  tax_cents: cents.nullable().optional(),
  balance_cents: cents.optional().default(0),
  is_paid: z.boolean().optional().default(false),
  is_memorized: z.boolean().optional().default(false),
  line_items: z.array(lineItemSchema).max(80).optional().default([]),
});

export const qbPaymentRowSchema = z.object({
  txn_id: text(64).min(1),
  edit_sequence: text(64).min(1),
  customer_list_id: text(64).min(1),
  txn_date: isoDate,
  amount_cents: cents.positive(),
  payment_method: optionalText(80),
  ref_number: optionalText(64),
  deposit_account: optionalText(120),
});

export const qbTodoRowSchema = z.object({
  todo_id: text(64).min(1),
  notes: text(8000).min(1),
  is_done: z.boolean().optional().default(false),
  reminder_date: optionalIsoDate,
});

export const MIRROR_BATCH_MAX = 400;

export const qbMirrorBodySchema = qbHeartbeatSchema.extend({
  company_file: text(500).min(1),
  customers: z.array(qbCustomerRowSchema).max(MIRROR_BATCH_MAX).optional(),
  invoices: z.array(qbInvoiceRowSchema).max(MIRROR_BATCH_MAX).optional(),
  payments: z.array(qbPaymentRowSchema).max(MIRROR_BATCH_MAX).optional(),
  todos: z.array(qbTodoRowSchema).max(MIRROR_BATCH_MAX).optional(),
});

export type QbHeartbeat = z.infer<typeof qbHeartbeatSchema>;
export type QbCustomerRow = z.infer<typeof qbCustomerRowSchema>;
export type QbInvoiceRow = z.infer<typeof qbInvoiceRowSchema>;
export type QbPaymentRow = z.infer<typeof qbPaymentRowSchema>;
export type QbTodoRow = z.infer<typeof qbTodoRowSchema>;
export type QbMirrorBody = z.infer<typeof qbMirrorBodySchema>;
