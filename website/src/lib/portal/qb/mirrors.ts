import "server-only";

import { getPortalAdminClient } from "@/lib/portal/supabase/admin";
import type { QbMirrorBody } from "@/lib/portal/qb/schemas";

const UPSERT_CHUNK = 200;

export type MirrorCounts = {
  customers: number;
  invoices: number;
  payments: number;
  todos: number;
};

/**
 * Upsert mirror batches. `profile_id` is never written here so a later
 * identity link survives a customer refresh (PORTAL_PLAN.md 9.5.4).
 * Rows missing from a batch are left in place; this is incremental ingest.
 */
export async function ingestQbMirrors(body: QbMirrorBody): Promise<MirrorCounts> {
  const admin = getPortalAdminClient();
  const now = new Date().toISOString();
  const counts: MirrorCounts = { customers: 0, invoices: 0, payments: 0, todos: 0 };

  if (body.customers) {
    const rows = dedupeBy(body.customers, (row) => row.list_id).map((row) => ({
      list_id: row.list_id,
      edit_sequence: row.edit_sequence,
      name: row.name,
      company_name: row.company_name,
      email: row.email,
      phone: row.phone,
      is_active: row.is_active,
      parent_list_id: row.parent_list_id,
      balance_cents: row.balance_cents,
      synced_at: now,
    }));
    await upsertChunks("qb_customers", "list_id", rows);
    counts.customers = rows.length;
  }

  if (body.invoices) {
    const rows = dedupeBy(body.invoices, (row) => row.txn_id).map((row) => ({
      txn_id: row.txn_id,
      edit_sequence: row.edit_sequence,
      customer_list_id: row.customer_list_id,
      ref_number: row.ref_number,
      txn_date: row.txn_date,
      due_on: row.due_on ?? null,
      amount_cents: row.amount_cents,
      subtotal_cents: row.subtotal_cents ?? null,
      tax_cents: row.tax_cents ?? null,
      balance_cents: row.balance_cents,
      is_paid: row.is_paid,
      is_memorized: row.is_memorized,
      line_items: row.line_items,
      synced_at: now,
    }));
    await upsertChunks("qb_invoices", "txn_id", rows);
    counts.invoices = rows.length;
  }

  if (body.payments) {
    const rows = dedupeBy(body.payments, (row) => row.txn_id).map((row) => ({
      txn_id: row.txn_id,
      edit_sequence: row.edit_sequence,
      customer_list_id: row.customer_list_id,
      txn_date: row.txn_date,
      amount_cents: row.amount_cents,
      payment_method: row.payment_method,
      ref_number: row.ref_number,
      deposit_account: row.deposit_account,
      synced_at: now,
    }));
    await upsertChunks("qb_payments", "txn_id", rows);
    counts.payments = rows.length;
  }

  if (body.todos) {
    const rows = dedupeBy(body.todos, (row) => row.todo_id).map((row) => ({
      todo_id: row.todo_id,
      notes: row.notes,
      is_done: row.is_done,
      reminder_date: row.reminder_date ?? null,
      synced_at: now,
    }));
    await upsertChunks("qb_todos", "todo_id", rows);
    counts.todos = rows.length;
  }

  return counts;

  async function upsertChunks(
    table: "qb_customers" | "qb_invoices" | "qb_payments" | "qb_todos",
    onConflict: string,
    rows: Record<string, unknown>[],
  ) {
    for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
      const chunk = rows.slice(i, i + UPSERT_CHUNK);
      const { error } = await admin.from(table).upsert(chunk as never, { onConflict });
      if (error) {
        console.error(`[qb] ${table} upsert failed:`, error);
        throw new Error(`Failed to upsert ${table}.`);
      }
    }
  }
}

function dedupeBy<T>(rows: T[], key: (row: T) => string): T[] {
  const map = new Map<string, T>();
  for (const row of rows) map.set(key(row), row);
  return [...map.values()];
}

export function mirrorKeysPresent(body: QbMirrorBody): boolean {
  return (
    body.customers !== undefined ||
    body.invoices !== undefined ||
    body.payments !== undefined ||
    body.todos !== undefined
  );
}
