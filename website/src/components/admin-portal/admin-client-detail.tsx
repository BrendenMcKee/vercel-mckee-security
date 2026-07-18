"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Tables } from "@/lib/portal/database.types";
import {
  deleteClientAction,
  resendInviteAction,
  setClientStatusAction,
  updateClientProfileAction,
} from "@/lib/portal/actions/clients";
import {
  assignServiceAction,
  updateServiceLineCountAction,
  updateServiceStatusAction,
  updateServiceTierAction,
} from "@/lib/portal/actions/services";
import {
  SERVICE_TIERS,
  SERVICE_TYPE_LABELS,
  isPerLineService,
  tierLabel,
  type ServiceType,
} from "@/lib/portal/service-labels";
import {
  addDeviceAction,
  deleteDeviceAction,
  updateDeviceAction,
} from "@/lib/portal/actions/devices";
import { recordManualPayment, updateServiceBilling } from "@/lib/portal/actions/payments";
import { formatPhone } from "@/lib/portal/phone";
import {
  BILLING_INTERVAL_LABELS,
  PAYMENT_METHOD_LABELS,
  formatCents,
  intervalMonths,
  tierOptionLabel,
  type BillingInterval,
  type PaymentMethod,
} from "@/lib/portal/billing";
import {
  DEVICE_CATEGORIES,
  DEVICE_CATEGORY_LABELS,
  DEVICE_PRESETS,
  deviceCategoryLabel,
  deviceExpiryDate,
  isDeviceExpired,
  type DeviceCategory,
} from "@/lib/portal/devices";
import { adminInputClass, adminSelectClass, ProfileStatusBadge, ServiceStatusBadge } from "@/components/admin-portal/ui";
import { CallerIdEditor, type CallerIdContact } from "@/components/portal/caller-id-editor";

type InvitationSummary = Pick<
  Tables<"invitations">,
  "id" | "target_email" | "expires_at" | "used_at" | "created_at"
>;

export type AdminClientDetailRow = Tables<"profiles"> & {
  services: Tables<"services">[];
  invitations: InvitationSummary[];
};

type Notice = { kind: "ok" | "error"; text: string; link?: string } | null;

const buttonSecondary =
  "cursor-pointer rounded-lg border border-white/20 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white/80 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-default disabled:opacity-50";

function NoticeBanner({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return (
    <div
      role="status"
      className={`rounded-xl border p-4 text-sm ${
        notice.kind === "ok"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
          : "border-amber-500/30 bg-amber-500/10 text-amber-200"
      }`}
    >
      <p>{notice.text}</p>
      {notice.link && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <code className="break-all rounded bg-black/30 px-2 py-1 text-xs text-white/80">
            {notice.link}
          </code>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(notice.link!)}
            className={buttonSecondary}
          >
            Copy
          </button>
        </div>
      )}
    </div>
  );
}

function ProfileCard({ client }: { client: AdminClientDetailRow }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    firstName: client.first_name,
    lastName: client.last_name,
    email: client.email ?? "",
    address: client.address ?? "",
  });
  const [notice, setNotice] = useState<Notice>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    startTransition(async () => {
      const result = await updateClientProfileAction({ profileId: client.id, ...form });
      if (!result.ok) {
        setNotice({ kind: "error", text: result.error });
        return;
      }
      setEditing(false);
      setNotice({ kind: "ok", text: "Profile saved." });
    });
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-surface p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-white">Profile</h2>
          <ProfileStatusBadge status={client.status} />
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing((v) => !v);
            setNotice(null);
          }}
          className={buttonSecondary}
        >
          {editing ? "Cancel" : "Edit"}
        </button>
      </div>

      <div className="mt-4 space-y-3">
        <NoticeBanner notice={notice} />

        {editing ? (
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm text-white/80">
              First name *
              <input
                required
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                className={adminInputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-white/80">
              Last name *
              <input
                required
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                className={adminInputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-white/80">
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className={adminInputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-white/80">
              Address
              <input
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                className={adminInputClass}
              />
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={pending}
                className="cursor-pointer rounded-xl bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-all duration-200 hover:bg-[var(--primary-hover)] disabled:cursor-default disabled:opacity-50"
              >
                {pending ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </form>
        ) : (
          <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-widest text-white/40">Email</dt>
              <dd className="mt-1 text-white/80">{client.email ?? "Not on file"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-widest text-white/40">Address</dt>
              <dd className="mt-1 text-white/80">{client.address ?? "Not on file"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-widest text-white/40">Created</dt>
              <dd className="mt-1 text-white/80">
                {new Date(client.created_at).toLocaleDateString("en-CA")}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-widest text-white/40">Sign-in</dt>
              <dd className="mt-1 text-white/80">
                {client.user_id ? "Activated" : "Not activated yet"}
              </dd>
            </div>
          </dl>
        )}
      </div>
    </div>
  );
}

export type CardPaymentEntry = {
  id: string;
  serviceId: string | null;
  paidOn: string;
  amountCents: number | null;
};

function AddServiceForm({ client }: { client: AdminClientDetailRow }) {
  const [notice, setNotice] = useState<Notice>(null);
  const [pending, startTransition] = useTransition();
  const [assignType, setAssignType] = useState<ServiceType | "">("");
  const [assignTier, setAssignTier] = useState("");
  const [assignLines, setAssignLines] = useState("1");

  const unassignedTypes = (Object.keys(SERVICE_TIERS) as ServiceType[]).filter(
    (type) => !client.services.some((s) => s.service_type === type),
  );
  if (unassignedTypes.length === 0) return null;

  const perLine = assignType !== "" && isPerLineService(assignType);

  function assign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assignType || !assignTier) return;
    const lineCount = perLine ? Number.parseInt(assignLines, 10) : 1;
    if (perLine && (!Number.isFinite(lineCount) || lineCount < 1)) {
      setNotice({ kind: "error", text: "Enter how many phone lines this plan covers." });
      return;
    }
    setNotice(null);
    startTransition(async () => {
      const result = await assignServiceAction({
        profileId: client.id,
        serviceType: assignType,
        tier: assignTier,
        lineCount,
      });
      if (!result.ok) {
        setNotice({ kind: "error", text: result.error });
        return;
      }
      setAssignType("");
      setAssignTier("");
      setAssignLines("1");
      setNotice({ kind: "ok", text: "Service added. Set up its billing below." });
    });
  }

  return (
    <div className="space-y-3">
      <NoticeBanner notice={notice} />
      <form
        onSubmit={assign}
        className="grid gap-3 rounded-xl border border-dashed border-white/15 p-4 sm:flex sm:flex-wrap sm:items-end"
      >
        <label className="flex min-w-0 flex-col gap-1.5 text-sm text-white/80">
          Add service
          <select
            value={assignType}
            onChange={(e) => {
              setAssignType(e.target.value as ServiceType | "");
              setAssignTier("");
            }}
            className={`${adminSelectClass} max-w-full`}
          >
            <option value="">Choose...</option>
            {unassignedTypes.map((type) => (
              <option key={type} value={type}>
                {SERVICE_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-sm text-white/80">
          Plan
          <select
            value={assignTier}
            onChange={(e) => setAssignTier(e.target.value)}
            disabled={!assignType}
            className={`${adminSelectClass} max-w-full disabled:opacity-50`}
          >
            <option value="">Choose...</option>
            {assignType &&
              SERVICE_TIERS[assignType].map((tier) => (
                <option key={tier} value={tier}>
                  {tierOptionLabel(assignType, tier)}
                </option>
              ))}
          </select>
        </label>
        <label
          className={`flex min-w-0 flex-col gap-1.5 text-sm transition-opacity ${perLine ? "text-white/80" : "pointer-events-none text-white/80 opacity-40"}`}
        >
          Phone lines
          <input
            type="number"
            min={1}
            max={100}
            disabled={!perLine}
            value={assignLines}
            onChange={(e) => setAssignLines(e.target.value)}
            className={`${adminInputClass} sm:w-24`}
          />
        </label>
        <button
          type="submit"
          disabled={pending || !assignType || !assignTier}
          className="cursor-pointer rounded-xl bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-all duration-200 hover:bg-[var(--primary-hover)] disabled:cursor-default disabled:opacity-50"
        >
          {pending ? "Adding..." : "Add Service"}
        </button>
      </form>
    </div>
  );
}

function InvitationCard({ client }: { client: AdminClientDetailRow }) {
  const [notice, setNotice] = useState<Notice>(null);
  const [pending, startTransition] = useTransition();

  const open = client.invitations.find((inv) => !inv.used_at);
  const used = client.invitations.find((inv) => inv.used_at);

  let stateLine: string;
  if (client.status !== "pending") {
    stateLine = used
      ? `Activated ${new Date(used.used_at!).toLocaleDateString("en-CA")}.`
      : "Account is active.";
  } else if (!open) {
    stateLine = "No open invitation.";
  } else if (new Date(open.expires_at).getTime() <= Date.now()) {
    stateLine = `Invitation expired ${new Date(open.expires_at).toLocaleDateString("en-CA")}.`;
  } else {
    stateLine = `Invitation open, expires ${new Date(open.expires_at).toLocaleDateString("en-CA")}${open.target_email ? `, sent to ${open.target_email}` : ""}.`;
  }

  function resend() {
    setNotice(null);
    startTransition(async () => {
      const result = await resendInviteAction(client.id);
      if (!result.ok) {
        setNotice({ kind: "error", text: result.error });
        return;
      }
      if (!result.emailAttempted) {
        setNotice({ kind: "ok", text: "New invitation created. No email on file, copy the link:", link: result.activateUrl });
      } else if (!result.emailSent) {
        setNotice({ kind: "error", text: "Invitation refreshed, but the email failed to send. Copy the link:", link: result.activateUrl });
      } else {
        setNotice({ kind: "ok", text: "Invitation refreshed and email re-sent." });
      }
    });
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-surface p-4 sm:p-6">
      <h2 className="text-lg font-bold text-white">Invitation</h2>
      <div className="mt-4 space-y-3">
        <NoticeBanner notice={notice} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-white/70">{stateLine}</p>
          {client.status === "pending" && (
            <button type="button" disabled={pending} onClick={resend} className={buttonSecondary}>
              {pending ? "Sending..." : "Resend Invite"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DangerZone({ client }: { client: AdminClientDetailRow }) {
  const router = useRouter();
  const [notice, setNotice] = useState<Notice>(null);
  const [pending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmName, setConfirmName] = useState("");

  const disabled = client.status === "disabled";
  const name = `${client.first_name} ${client.last_name}`;
  const nameMatches =
    confirmName.trim().replace(/\s+/g, " ").toLowerCase() ===
    name.trim().replace(/\s+/g, " ").toLowerCase();

  function toggleStatus() {
    const confirmed = window.confirm(
      disabled
        ? `Re-enable ${name}? They will be able to sign in again.`
        : `Disable ${name}? They will be locked out of the portal until re-enabled. Their data is kept.`,
    );
    if (!confirmed) return;
    setNotice(null);
    startTransition(async () => {
      const result = await setClientStatusAction({
        profileId: client.id,
        status: disabled ? "active" : "disabled",
      });
      setNotice(
        result.ok
          ? { kind: "ok", text: disabled ? "Account re-enabled. They can sign in again." : "Account disabled. They can no longer sign in." }
          : { kind: "error", text: result.error },
      );
    });
  }

  function remove() {
    if (!nameMatches) return;
    setNotice(null);
    startTransition(async () => {
      const result = await deleteClientAction({ profileId: client.id, confirmName });
      if (!result.ok) {
        setNotice({ kind: "error", text: result.error });
        return;
      }
      router.push("/admin-dashboard?tab=clients");
    });
  }

  return (
    <div className="rounded-2xl border border-red-500/20 bg-surface p-4 sm:p-6">
      <h2 className="text-lg font-bold text-white">Account Controls</h2>
      <div className="mt-4 space-y-3">
        <NoticeBanner notice={notice} />

        {(client.user_id || disabled) && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-background p-4">
            <div className="max-w-xl">
              <p className="text-sm font-bold text-white">
                {disabled ? "Re-enable account" : "Disable account"}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-white/50">
                {disabled
                  ? "This account is currently disabled. Re-enabling lets the client sign in again; everything is exactly as they left it."
                  : "Temporarily locks the client out of the portal; they cannot sign in until you re-enable them. Nothing is removed: their services, billing, contact list, and history all stay, and automatic card payments keep running. Use this instead of deleting when a situation might get resolved."}
              </p>
            </div>
            <button type="button" disabled={pending} onClick={toggleStatus} className={buttonSecondary}>
              {disabled ? "Re-enable Account" : "Disable Account"}
            </button>
          </div>
        )}

        <div className="rounded-xl border border-red-500/25 bg-background p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="max-w-xl">
              <p className="text-sm font-bold text-white">Delete client</p>
              <p className="mt-1 text-xs leading-relaxed text-white/50">
                Permanently erases this client everywhere: their sign-in,
                profile, services, alarm contact list, devices, payment
                history, and invitations. Any automatic card payments are
                stopped in Stripe first. This cannot be undone. If you just
                need to lock them out for a while, disable the account
                instead.
              </p>
            </div>
            {!confirmingDelete && (
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setConfirmingDelete(true);
                  setConfirmName("");
                  setNotice(null);
                }}
                className="cursor-pointer rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-red-300 transition-colors hover:bg-red-500/15 disabled:cursor-default disabled:opacity-50"
              >
                Delete Client...
              </button>
            )}
          </div>

          {confirmingDelete && (
            <div className="mt-4 space-y-3 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
              <p className="text-sm text-white/80">
                To confirm, type the client&apos;s full name exactly:{" "}
                <span className="font-bold text-white">{name}</span>
              </p>
              <input
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder={name}
                autoComplete="off"
                className={`${adminInputClass} w-full max-w-md`}
                aria-label="Type the client's full name to confirm deletion"
              />
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={pending || !nameMatches}
                  onClick={remove}
                  className="cursor-pointer rounded-lg border border-red-500/50 bg-red-500/15 px-4 py-2 text-xs font-bold uppercase tracking-wide text-red-200 transition-colors hover:bg-red-500/25 disabled:cursor-default disabled:opacity-40"
                >
                  {pending ? "Deleting..." : "Permanently Delete This Client"}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setConfirmingDelete(false);
                    setConfirmName("");
                  }}
                  className={buttonSecondary}
                >
                  Keep the Client
                </button>
                {confirmName.trim() !== "" && !nameMatches && (
                  <p className="text-xs text-white/45">The name does not match yet.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Services & Billing (merged, stakeholder round 3): one box per service holds
// the plan (what they have) and the billing (how they pay) together. Plan
// changes on autopay swap the Stripe subscription price; the custom rate and
// interval inputs only exist on the manual rail because on autopay the plan's
// Stripe price is what actually gets charged.
// ---------------------------------------------------------------------------

function ServiceRow({ service }: { service: Tables<"services"> }) {
  const [notice, setNotice] = useState<Notice>(null);
  const [pending, startTransition] = useTransition();
  const [method, setMethod] = useState<"stripe" | "manual">(service.billing_method);
  const [cycle, setCycle] = useState<BillingInterval>(service.billing_interval);
  const [amount, setAmount] = useState(
    service.monthly_amount_cents != null ? (service.monthly_amount_cents / 100).toFixed(2) : "",
  );
  const [dueOn, setDueOn] = useState(service.next_due_on ?? "");
  const [lines, setLines] = useState(String(service.line_count));

  const perLine = isPerLineService(service.service_type, service.tier);

  // Prefill the received amount with one full invoice (monthly rate x
  // interval, pre-tax); the admin adjusts for tax or partial payments.
  const [payAmount, setPayAmount] = useState(
    service.monthly_amount_cents != null
      ? ((service.monthly_amount_cents * intervalMonths(service.billing_interval)) / 100).toFixed(2)
      : "",
  );
  const [payMethod, setPayMethod] = useState<PaymentMethod>("etransfer");
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [payNote, setPayNote] = useState("");

  const serviceLabel = SERVICE_TYPE_LABELS[service.service_type];

  function changeTier(tier: string) {
    if (tier === service.tier) return;
    setNotice(null);
    startTransition(async () => {
      const result = await updateServiceTierAction({ serviceId: service.id, tier });
      setNotice(
        result.ok
          ? {
              kind: "ok",
              text: `Plan changed to ${tierLabel(tier)}.${
                service.stripe_subscription_id
                  ? " Their automatic card payments now charge the new plan's rate; the next invoice reflects it."
                  : " The client dashboard reflects this immediately."
              }`,
            }
          : { kind: "error", text: result.error },
      );
    });
  }

  function saveLines() {
    const lineCount = Number.parseInt(lines, 10);
    if (!Number.isFinite(lineCount) || lineCount < 1) {
      setNotice({ kind: "error", text: "Enter how many phone lines this plan covers." });
      return;
    }
    if (lineCount === service.line_count) return;
    setNotice(null);
    startTransition(async () => {
      const result = await updateServiceLineCountAction({ serviceId: service.id, lineCount });
      setNotice(
        result.ok
          ? {
              kind: "ok",
              text: `Now billing for ${lineCount} line${lineCount === 1 ? "" : "s"}.${
                service.stripe_subscription_id
                  ? " Their automatic card payments charge the new total from the next invoice."
                  : ""
              }`,
            }
          : { kind: "error", text: result.error },
      );
    });
  }

  function changeStatus(status: "active" | "paused" | "cancelled") {
    if (status === "cancelled") {
      // Destructive admin action: explicit confirm (handover 14.2).
      const confirmed = window.confirm(`Cancel ${serviceLabel} for this client?`);
      if (!confirmed) return;
    }
    setNotice(null);
    startTransition(async () => {
      const result = await updateServiceStatusAction({ serviceId: service.id, status });
      setNotice(
        result.ok
          ? { kind: "ok", text: `${serviceLabel} is now ${status}.` }
          : { kind: "error", text: result.error },
      );
    });
  }

  function saveBilling() {
    setNotice(null);
    // On autopay the amount stays whatever the plan sets; only manual billing
    // takes a hand-entered rate.
    const cents =
      method === "stripe"
        ? service.monthly_amount_cents
        : amount.trim()
          ? Math.round(Number.parseFloat(amount) * 100)
          : null;
    if (method === "manual" && amount.trim() && (!Number.isFinite(cents) || cents! <= 0)) {
      setNotice({ kind: "error", text: "Enter a valid monthly amount." });
      return;
    }
    // Moving off autopay stops the client's card subscription in Stripe;
    // confirm because it changes how they get billed from today.
    if (method === "manual" && service.billing_method === "stripe" && service.stripe_subscription_id) {
      const confirmed = window.confirm(
        "Switch this client to manual billing?\n\nTheir automatic card payments will be stopped in Stripe. They are paid through the current period; after that you collect payments yourself (the system will send them due-date reminders).",
      );
      if (!confirmed) return;
    }
    startTransition(async () => {
      const result = await updateServiceBilling({
        serviceId: service.id,
        billingMethod: method,
        billingInterval: method === "stripe" ? service.billing_interval : cycle,
        monthlyAmountCents: cents,
        nextDueOn: method === "stripe" ? "" : dueOn,
      });
      setNotice(
        result.ok
          ? { kind: "ok", text: result.message ?? "Billing settings saved." }
          : { kind: "error", text: result.error },
      );
    });
  }

  function recordPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    const cents = Math.round(Number.parseFloat(payAmount) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      setNotice({ kind: "error", text: "Enter the amount that was received." });
      return;
    }
    startTransition(async () => {
      const result = await recordManualPayment({
        serviceId: service.id,
        amountCents: cents,
        method: payMethod,
        paidOn: payDate,
        note: payNote.trim() || undefined,
      });
      if (!result.ok) {
        setNotice({ kind: "error", text: result.error });
        return;
      }
      setPayNote("");
      setNotice({
        kind: "ok",
        text: `Payment recorded.${result.nextDueOn ? ` Next due ${result.nextDueOn}.` : ""}${
          result.emailSent === false ? " Confirmation email failed to send." : result.emailSent ? " Client emailed a confirmation." : ""
        }`,
      });
    });
  }

  const invoiceCents =
    service.monthly_amount_cents != null
      ? service.monthly_amount_cents * intervalMonths(service.billing_interval)
      : null;

  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-background p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-bold text-white">{serviceLabel}</span>
          <ServiceStatusBadge status={service.status} />
        </div>
        <span className="text-xs uppercase tracking-widest text-white/40">
          {service.billing_method === "stripe"
            ? service.stripe_subscription_id
              ? "Card on file, pays automatically"
              : "Card payments chosen, card not set up yet"
            : "Paid by e-Transfer / cheque / cash"}
        </span>
      </div>

      <NoticeBanner notice={notice} />

      <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-end">
        <label className="flex min-w-0 flex-col gap-1.5 text-sm text-white/80">
          Plan
          <select
            value={service.tier}
            disabled={pending}
            onChange={(e) => changeTier(e.target.value)}
            className={`${adminSelectClass} max-w-full`}
            aria-label={`${serviceLabel} plan`}
          >
            {SERVICE_TIERS[service.service_type].map((tier) => (
              <option key={tier} value={tier}>
                {tierOptionLabel(service.service_type, tier)}
              </option>
            ))}
          </select>
        </label>
        {perLine && (
          <>
            <label className="flex min-w-0 flex-col gap-1.5 text-sm text-white/80">
              Phone lines
              <input
                type="number"
                min={1}
                max={100}
                value={lines}
                onChange={(e) => setLines(e.target.value)}
                className={`${adminInputClass} sm:w-24`}
              />
            </label>
            {lines !== String(service.line_count) && (
              <button type="button" disabled={pending} onClick={saveLines} className={buttonSecondary}>
                {pending ? "Saving..." : "Save Lines"}
              </button>
            )}
          </>
        )}
        <div className="flex flex-wrap items-center gap-2 sm:items-end sm:gap-3">
          {service.status === "cancelled" || service.status === "paused" ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => changeStatus("active")}
              className={buttonSecondary}
            >
              Restart
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() => changeStatus("paused")}
                className={buttonSecondary}
              >
                Pause
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => changeStatus("cancelled")}
                className="cursor-pointer rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-red-300 transition-colors hover:bg-red-500/15 disabled:cursor-default disabled:opacity-50"
              >
                Cancel
              </button>
            </>
          )}
        </div>
        {service.service_type === "cloud_backup" && (
          <p className="w-full text-xs text-white/40">
            Runs on McKee-managed on-site hardware; footage service ships with Track 2.
          </p>
        )}
      </div>

      <div className="space-y-3 border-t border-white/10 pt-4">
        <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-end">
          <label className="flex min-w-0 flex-col gap-1.5 text-sm text-white/80">
            How they pay
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as "stripe" | "manual")}
              className={`${adminSelectClass} max-w-full`}
            >
              <option value="stripe">Automatic card payments</option>
              <option value="manual">e-Transfer / cheque / cash</option>
            </select>
          </label>
          {method === "manual" && (
            <>
              <label className="flex min-w-0 flex-col gap-1.5 text-sm text-white/80">
                Billed
                <select
                  value={cycle}
                  onChange={(e) => setCycle(e.target.value as BillingInterval)}
                  className={`${adminSelectClass} max-w-full`}
                >
                  {(Object.keys(BILLING_INTERVAL_LABELS) as BillingInterval[]).map((value) => (
                    <option key={value} value={value}>
                      {BILLING_INTERVAL_LABELS[value]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-w-0 flex-col gap-1.5 text-sm text-white/80">
                Monthly rate ($, before tax)
                <input
                  inputMode="decimal"
                  placeholder="34.95"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={adminInputClass}
                />
              </label>
              <label className="flex min-w-0 flex-col gap-1.5 text-sm text-white/80">
                Next payment due
                <input
                  type="date"
                  value={dueOn}
                  onChange={(e) => setDueOn(e.target.value)}
                  className={adminInputClass}
                />
              </label>
            </>
          )}
          <button type="button" disabled={pending} onClick={saveBilling} className={buttonSecondary}>
            {pending ? "Saving..." : "Save Billing"}
          </button>
          {method === "manual" &&
            cycle === "annual" &&
            amount.trim() &&
            Number.isFinite(Number.parseFloat(amount)) && (
              <p className="w-full text-xs text-white/40">
                Yearly invoice: ${(Number.parseFloat(amount) * 12).toFixed(2)} plus tax
                (billed once a year).
              </p>
            )}
        </div>

        {method === "stripe" && (
          <div className="rounded-lg border border-white/10 bg-surface/60 p-3 text-xs leading-relaxed text-white/50">
            <p>
              {invoiceCents != null && (
                <>
                  Charges{" "}
                  <span className="font-semibold text-white/80">
                    {formatCents(invoiceCents)} plus tax
                    {service.billing_interval === "annual" ? " per year" : " per month"}
                  </span>
                  {perLine && ` for ${service.line_count} line${service.line_count === 1 ? "" : "s"}`}
                  {". "}
                </>
              )}
              The rate comes from the plan above; changing the plan updates the
              card charge automatically. There is nothing to type in here.
            </p>
            {service.next_due_on && (
              <p className="mt-1">
                Next automatic payment: <span className="text-white/80">{service.next_due_on}</span>
              </p>
            )}
            {service.billing_method === "stripe" && !service.stripe_subscription_id && (
              <p className="mt-1">
                The client sees a &ldquo;Set up automatic payments&rdquo; button
                on their dashboard until they enter their card.
              </p>
            )}
          </div>
        )}
      </div>

      {service.billing_method === "manual" && (
        <form
          onSubmit={recordPayment}
          className="grid gap-3 rounded-xl border border-dashed border-emerald-500/25 bg-emerald-500/5 p-4 sm:flex sm:flex-wrap sm:items-end"
        >
          <p className="w-full text-xs font-bold uppercase tracking-widest text-emerald-300">
            Record a received payment
          </p>
          <label className="flex min-w-0 flex-col gap-1.5 text-sm text-white/80">
            Amount ($)
            <input
              inputMode="decimal"
              required
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className={adminInputClass}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1.5 text-sm text-white/80">
            Method
            <select
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
              className={`${adminSelectClass} max-w-full`}
            >
              {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1.5 text-sm text-white/80">
            Received on
            <input
              type="date"
              required
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              className={adminInputClass}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1.5 text-sm text-white/80 sm:min-w-[12rem] sm:flex-1">
            Note
            <input
              placeholder="e.g. e-Transfer ref 12345"
              maxLength={300}
              value={payNote}
              onChange={(e) => setPayNote(e.target.value)}
              className={adminInputClass}
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="cursor-pointer rounded-xl bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-all duration-200 hover:bg-[var(--primary-hover)] disabled:cursor-default disabled:opacity-50"
          >
            {pending ? "Recording..." : "Record Payment"}
          </button>
        </form>
      )}
    </div>
  );
}

function ServicesBillingCard({
  client,
  manualPayments,
  cardPayments,
}: {
  client: AdminClientDetailRow;
  manualPayments: Tables<"manual_payments">[];
  cardPayments: CardPaymentEntry[];
}) {
  const serviceLabel = (serviceId: string | null) => {
    const service = serviceId ? client.services.find((s) => s.id === serviceId) : null;
    return service ? SERVICE_TYPE_LABELS[service.service_type] : "Removed service";
  };

  // One combined history, newest first: hand-recorded payments and automatic
  // card payments side by side, the same view the client sees.
  const history = [
    ...manualPayments.map((payment) => ({
      key: `m-${payment.id}`,
      paidOn: payment.paid_on,
      amountCents: payment.amount_cents as number | null,
      how: PAYMENT_METHOD_LABELS[payment.method],
      service: serviceLabel(payment.service_id),
      note: payment.note,
      recordedBy: payment.recorded_by_email,
    })),
    ...cardPayments.map((payment) => ({
      key: `c-${payment.id}`,
      paidOn: payment.paidOn,
      amountCents: payment.amountCents,
      how: "Card (automatic)",
      service: serviceLabel(payment.serviceId),
      note: null as string | null,
      recordedBy: null as string | null,
    })),
  ].sort((a, b) => b.paidOn.localeCompare(a.paidOn));

  return (
    <div className="rounded-2xl border border-white/10 bg-surface p-4 sm:p-6">
      <h2 className="text-lg font-bold text-white">Services &amp; Billing</h2>
      <p className="mt-1 text-xs text-white/40">
        Each service shows what the client has and how they pay for it, in one
        place. Only McKee can change plans; the client sees theirs read-only.
        Clients either pay automatically by card, or pay you directly and you
        record it here. Recorded payments can&apos;t be edited afterwards; if
        you make a mistake, record a correcting entry (a negative amount works).
      </p>

      <div className="mt-4 space-y-4">
        {client.services.length === 0 && (
          <p className="rounded-xl border border-white/10 bg-background p-4 text-sm text-white/40">
            No services yet. Add one below.
          </p>
        )}
        {client.services.map((service) => (
          <ServiceRow key={service.id} service={service} />
        ))}

        <AddServiceForm client={client} />

        {history.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-background p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-white/40">
              Payment history
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {history.map((payment) => (
                <li key={payment.key} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/5 pb-2 last:border-0 last:pb-0">
                  <span className="text-white/80">
                    <span className="font-bold text-white">
                      {payment.amountCents != null ? formatCents(payment.amountCents) : "Payment"}
                    </span>
                    {" "}&middot; {payment.how} &middot; {payment.service}
                    {payment.note && <span className="text-white/40"> &middot; {payment.note}</span>}
                  </span>
                  <span className="text-xs text-white/40">
                    {payment.paidOn}
                    {payment.recordedBy && ` · by ${payment.recordedBy}`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phase 4: caller ID card (R23 admin-assisted changes with R24 audit trail)
// and the immutable change history.
// ---------------------------------------------------------------------------

const AUTHORIZED_VIA_LABELS: Record<string, string> = {
  client_email: "client email",
  client_verbal: "verbal request",
  client_in_person: "in person",
  mckee_initiated: "McKee-initiated",
};

type DiffEntry = { phone: string; label: string; passcode?: string | null };

function HistoryDiffList({ entries, kind }: { entries: DiffEntry[]; kind: "added" | "removed" }) {
  if (entries.length === 0) return null;
  const color = kind === "added" ? "text-emerald-300" : "text-red-300";
  const sign = kind === "added" ? "+" : "−";
  return (
    <>
      {entries.map((entry) => (
        <p key={`${kind}-${entry.phone}-${entry.label}`} className={`text-sm ${color}`}>
          {sign} {entry.label} <span className="text-white/50">{formatPhone(entry.phone)}</span>
          {entry.passcode && (
            <span className="text-white/40"> &middot; passcode: {entry.passcode}</span>
          )}
        </p>
      ))}
    </>
  );
}

function CallerIdCard({
  client,
  contacts,
  changes,
}: {
  client: AdminClientDetailRow;
  contacts: CallerIdContact[];
  changes: Tables<"caller_id_changes">[];
}) {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div className="rounded-2xl border border-white/10 bg-surface p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-white">Caller ID List</h2>
        <button type="button" onClick={() => setShowHistory((v) => !v)} className={buttonSecondary}>
          {showHistory ? "Hide History" : `History (${changes.length})`}
        </button>
      </div>
      <p className="mt-1 text-xs text-white/40">
        Changes here are made on the client&apos;s behalf. You must record how
        they authorized it and why; the history below is permanent and the
        client is automatically emailed exactly what changed.
      </p>

      <div className="mt-5">
        <CallerIdEditor
          key={contacts.map((c) => `${c.phone}|${c.label}|${c.passcode ?? ""}`).join(",")}
          variant="admin"
          profileId={client.id}
          initialContacts={contacts}
        />
      </div>

      {showHistory && (
        <div className="mt-6 space-y-3 border-t border-white/10 pt-5">
          <p className="text-xs font-bold uppercase tracking-widest text-white/40">
            Change history (permanent record)
          </p>
          {changes.length === 0 && (
            <p className="text-sm text-white/40">No changes recorded yet.</p>
          )}
          {changes.map((change) => {
            const added = (change.added ?? []) as DiffEntry[];
            const removed = (change.removed ?? []) as DiffEntry[];
            const isAdmin = change.changed_via === "admin_dashboard";
            return (
              <div key={change.id} className="rounded-xl border border-white/10 bg-background p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-bold text-white">
                    {isAdmin ? "Admin change" : "Client change"}
                    <span className="font-normal text-white/50">
                      {" "}by {change.changed_by_email ?? "unknown"}
                    </span>
                  </p>
                  <p className="text-xs text-white/40">
                    {new Date(change.created_at).toLocaleString("en-CA")}
                  </p>
                </div>
                <div className="mt-2 space-y-0.5">
                  <HistoryDiffList entries={added} kind="added" />
                  <HistoryDiffList entries={removed} kind="removed" />
                </div>
                {isAdmin && (
                  <div className="mt-2 space-y-1 text-xs text-white/50">
                    <p>
                      Authorized via{" "}
                      <span className="text-white/80">
                        {AUTHORIZED_VIA_LABELS[change.authorized_via ?? ""] ?? change.authorized_via}
                      </span>
                      {" "}&middot; Reason: <span className="text-white/80">{change.change_reason}</span>
                    </p>
                    <p>
                      {change.client_notified_at
                        ? `Client notified ${new Date(change.client_notified_at).toLocaleString("en-CA")}`
                        : "Client notification email NOT confirmed. Follow up manually."}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Devices card (stakeholder round 3): an open equipment list. Accounts start
// with no devices; admins add whatever they want replacement reminders for,
// with a custom name and a per-device replacement interval. Renames keep the
// alert guard; a new date or interval re-arms it (R14). Clients see the list
// read-only on their dashboard.
// ---------------------------------------------------------------------------

function DeviceRow({ device }: { device: Tables<"devices"> }) {
  const [notice, setNotice] = useState<Notice>(null);
  const [pending, startTransition] = useTransition();
  const [label, setLabel] = useState(device.label);
  const [category, setCategory] = useState(device.category);
  const [installedOn, setInstalledOn] = useState(device.installed_on);
  const [years, setYears] = useState(String(device.lifetime_years));

  const expired = isDeviceExpired(device.installed_on, device.lifetime_years);
  const dueDate = deviceExpiryDate(device.installed_on, device.lifetime_years).toLocaleDateString(
    "en-CA",
    { year: "numeric", month: "long" },
  );
  const dirty =
    label !== device.label ||
    category !== device.category ||
    installedOn !== device.installed_on ||
    years !== String(device.lifetime_years);

  function save() {
    setNotice(null);
    const lifetimeYears = Number.parseInt(years, 10);
    if (!Number.isFinite(lifetimeYears) || lifetimeYears < 1) {
      setNotice({ kind: "error", text: "Enter how many years until replacement." });
      return;
    }
    startTransition(async () => {
      const result = await updateDeviceAction({
        deviceId: device.id,
        label,
        category,
        installedOn,
        lifetimeYears,
      });
      setNotice(
        result.ok
          ? { kind: "ok", text: "Device saved." }
          : { kind: "error", text: result.error },
      );
    });
  }

  function remove() {
    const confirmed = window.confirm(
      `Stop tracking "${device.label}"?\n\nIt disappears from this account and the client's dashboard, and no more replacement reminders are sent for it.`,
    );
    if (!confirmed) return;
    setNotice(null);
    startTransition(async () => {
      const result = await deleteDeviceAction(device.id);
      if (!result.ok) setNotice({ kind: "error", text: result.error });
    });
  }

  return (
    <div
      className={`rounded-xl border p-4 ${
        expired ? "border-amber-500/40 bg-amber-500/10" : "border-white/10 bg-background"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="font-bold text-white">{device.label}</p>
          <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white/55">
            {deviceCategoryLabel(device.category)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {expired && (
            <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-300">
              Replacement due
            </span>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={remove}
            className="cursor-pointer rounded-lg border border-red-500/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-red-300 transition-colors hover:bg-red-500/15 disabled:cursor-default disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      </div>
      <p className="mt-1 text-xs text-white/50">
        {expired ? `Replacement was due ${dueDate}.` : `Next replacement due ${dueDate}.`}
      </p>

      <div className="mt-3 space-y-3">
        <NoticeBanner notice={notice} />
        <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-end">
          <label className="flex min-w-0 flex-col gap-1.5 text-xs text-white/60 sm:min-w-[10rem] sm:flex-1">
            Device name
            <input
              value={label}
              maxLength={80}
              onChange={(e) => setLabel(e.target.value)}
              className={adminInputClass}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1.5 text-xs text-white/60">
            Category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={`${adminSelectClass} max-w-full`}
            >
              {DEVICE_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {DEVICE_CATEGORY_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1.5 text-xs text-white/60">
            Installed / last replaced
            <input
              type="date"
              value={installedOn}
              onChange={(e) => setInstalledOn(e.target.value)}
              className={adminInputClass}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1.5 text-xs text-white/60">
            Replace every (years)
            <input
              type="number"
              min={1}
              max={50}
              value={years}
              onChange={(e) => setYears(e.target.value)}
              className={`${adminInputClass} sm:w-24`}
            />
          </label>
          <button
            type="button"
            disabled={pending || !dirty || !label.trim() || !installedOn}
            onClick={save}
            className={buttonSecondary}
          >
            {pending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DevicesCard({
  client,
  devices,
}: {
  client: AdminClientDetailRow;
  devices: Tables<"devices">[];
}) {
  const [notice, setNotice] = useState<Notice>(null);
  const [pending, startTransition] = useTransition();
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState<DeviceCategory>("other");
  const [installedOn, setInstalledOn] = useState("");
  const [years, setYears] = useState("5");

  function handleLabelChange(value: string) {
    setLabel(value);
    // Picking a suggestion prefills its category and usual replacement interval.
    const preset = DEVICE_PRESETS.find((p) => p.label === value);
    if (preset) {
      setCategory(preset.category);
      setYears(String(preset.years));
    }
  }

  function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    const lifetimeYears = Number.parseInt(years, 10);
    if (!Number.isFinite(lifetimeYears) || lifetimeYears < 1) {
      setNotice({ kind: "error", text: "Enter how many years until replacement." });
      return;
    }
    startTransition(async () => {
      const result = await addDeviceAction({
        profileId: client.id,
        label,
        category,
        installedOn,
        lifetimeYears,
      });
      if (!result.ok) {
        setNotice({ kind: "error", text: result.error });
        return;
      }
      setLabel("");
      setCategory("other");
      setInstalledOn("");
      setYears("5");
      setNotice({ kind: "ok", text: "Device added. It now shows on the client's dashboard too." });
    });
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-surface p-4 sm:p-6">
      <h2 className="text-lg font-bold text-white">Devices</h2>
      <p className="mt-1 text-xs text-white/40">
        Track the equipment on this account and when it should be replaced.
        When a device comes due, the system automatically emails both the
        client and the McKee inbox. The client sees this list on their
        dashboard but only McKee can change it.
      </p>

      <div className="mt-4 space-y-3">
        <NoticeBanner notice={notice} />

        {devices.length === 0 && (
          <p className="rounded-xl border border-white/10 bg-background p-4 text-sm text-white/40">
            No devices tracked yet. Add the equipment you want replacement
            reminders for.
          </p>
        )}
        {devices.map((device) => (
          <DeviceRow key={device.id} device={device} />
        ))}

        <form
          onSubmit={add}
          className="grid gap-3 rounded-xl border border-dashed border-white/15 p-4 sm:flex sm:flex-wrap sm:items-end"
        >
          <label className="flex min-w-0 flex-col gap-1.5 text-sm text-white/80 sm:min-w-[12rem] sm:flex-1">
            Add a device
            <input
              required
              list="device-name-suggestions"
              placeholder="e.g. 7Ah Security System Battery"
              maxLength={80}
              value={label}
              onChange={(e) => handleLabelChange(e.target.value)}
              className={adminInputClass}
            />
            <datalist id="device-name-suggestions">
              {DEVICE_PRESETS.map((preset) => (
                <option key={preset.label} value={preset.label} />
              ))}
            </datalist>
          </label>
          <label className="flex min-w-0 flex-col gap-1.5 text-sm text-white/80">
            Category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as DeviceCategory)}
              className={`${adminSelectClass} max-w-full`}
            >
              {DEVICE_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {DEVICE_CATEGORY_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1.5 text-sm text-white/80">
            Installed on
            <input
              type="date"
              required
              value={installedOn}
              onChange={(e) => setInstalledOn(e.target.value)}
              className={adminInputClass}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1.5 text-sm text-white/80">
            Replace every (years)
            <input
              type="number"
              required
              min={1}
              max={50}
              value={years}
              onChange={(e) => setYears(e.target.value)}
              className={`${adminInputClass} sm:w-24`}
            />
          </label>
          <button
            type="submit"
            disabled={pending || !label.trim() || !installedOn}
            className="cursor-pointer rounded-xl bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-all duration-200 hover:bg-[var(--primary-hover)] disabled:cursor-default disabled:opacity-50"
          >
            {pending ? "Adding..." : "Add Device"}
          </button>
        </form>
      </div>
    </div>
  );
}

export function AdminClientDetail({
  client,
  callerIdContacts,
  callerIdChanges,
  devices,
  manualPayments,
  cardPayments,
}: {
  client: AdminClientDetailRow;
  callerIdContacts: CallerIdContact[];
  callerIdChanges: Tables<"caller_id_changes">[];
  devices: Tables<"devices">[];
  manualPayments: Tables<"manual_payments">[];
  cardPayments: CardPaymentEntry[];
}) {
  return (
    <div className="space-y-6">
      <ProfileCard client={client} />
      <ServicesBillingCard client={client} manualPayments={manualPayments} cardPayments={cardPayments} />
      <CallerIdCard client={client} contacts={callerIdContacts} changes={callerIdChanges} />
      <DevicesCard client={client} devices={devices} />
      <InvitationCard client={client} />
      <DangerZone client={client} />
    </div>
  );
}
