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
  updateServiceStatusAction,
  updateServiceTierAction,
} from "@/lib/portal/actions/services";
import {
  SERVICE_TIERS,
  SERVICE_TYPE_LABELS,
  tierLabel,
  type ServiceType,
} from "@/lib/portal/service-labels";
import { setDeviceInstallDate } from "@/lib/portal/actions/caller-id";
import { recordManualPayment, updateServiceBilling } from "@/lib/portal/actions/payments";
import { formatPhone } from "@/lib/portal/phone";
import {
  BILLING_INTERVAL_LABELS,
  PAYMENT_METHOD_LABELS,
  formatCents,
  intervalMonths,
  type BillingInterval,
  type PaymentMethod,
} from "@/lib/portal/billing";
import {
  DEVICE_LABELS,
  DEVICE_LIFETIME_YEARS,
  deviceExpiryDate,
  isDeviceExpired,
  type DeviceType,
} from "@/lib/portal/devices";
import { adminInputClass, ProfileStatusBadge, ServiceStatusBadge } from "@/components/admin-portal/ui";
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
    <div className="rounded-2xl border border-white/10 bg-surface p-6">
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

function ServicesCard({ client }: { client: AdminClientDetailRow }) {
  const [notice, setNotice] = useState<Notice>(null);
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [assignType, setAssignType] = useState<ServiceType | "">("");
  const [assignTier, setAssignTier] = useState("");

  const unassignedTypes = (Object.keys(SERVICE_TIERS) as ServiceType[]).filter(
    (type) => !client.services.some((s) => s.service_type === type),
  );

  function changeTier(service: Tables<"services">, tier: string) {
    if (tier === service.tier) return;
    setNotice(null);
    setBusyId(service.id);
    startTransition(async () => {
      const result = await updateServiceTierAction({ serviceId: service.id, tier });
      setBusyId(null);
      setNotice(
        result.ok
          ? { kind: "ok", text: `${SERVICE_TYPE_LABELS[service.service_type]} tier changed to ${tierLabel(tier)}. The client dashboard reflects this immediately.` }
          : { kind: "error", text: result.error },
      );
    });
  }

  function changeStatus(service: Tables<"services">, status: "active" | "paused" | "cancelled") {
    const label = SERVICE_TYPE_LABELS[service.service_type];
    if (status === "cancelled") {
      // Destructive admin action: explicit confirm (handover 14.2).
      const confirmed = window.confirm(`Cancel ${label} for this client?`);
      if (!confirmed) return;
    }
    setNotice(null);
    setBusyId(service.id);
    startTransition(async () => {
      const result = await updateServiceStatusAction({ serviceId: service.id, status });
      setBusyId(null);
      setNotice(
        result.ok
          ? { kind: "ok", text: `${label} is now ${status}.` }
          : { kind: "error", text: result.error },
      );
    });
  }

  function assign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assignType || !assignTier) return;
    setNotice(null);
    startTransition(async () => {
      const result = await assignServiceAction({
        profileId: client.id,
        serviceType: assignType,
        tier: assignTier,
      });
      if (!result.ok) {
        setNotice({ kind: "error", text: result.error });
        return;
      }
      setAssignType("");
      setAssignTier("");
      setNotice({ kind: "ok", text: "Service assigned." });
    });
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-surface p-6">
      <h2 className="text-lg font-bold text-white">Services</h2>
      <p className="mt-1 text-xs text-white/40">
        Only McKee can add, change, or cancel a client&apos;s services. The
        client sees their plans on their dashboard but cannot change them.
      </p>

      <div className="mt-4 space-y-3">
        <NoticeBanner notice={notice} />

        {client.services.length === 0 && (
          <p className="rounded-xl border border-white/10 bg-background p-4 text-sm text-white/40">
            No services assigned.
          </p>
        )}

        {client.services.map((service) => (
          <div
            key={service.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-background p-4"
          >
            <div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-white">
                  {SERVICE_TYPE_LABELS[service.service_type]}
                </span>
                <ServiceStatusBadge status={service.status} />
              </div>
              {service.service_type === "cloud_backup" && (
                <p className="mt-1 text-xs text-white/40">
                  Runs on McKee-managed on-site hardware; footage service ships with Track 2.
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={service.tier}
                disabled={pending}
                onChange={(e) => changeTier(service, e.target.value)}
                className={`${adminInputClass} cursor-pointer`}
                aria-label={`${SERVICE_TYPE_LABELS[service.service_type]} tier`}
              >
                {SERVICE_TIERS[service.service_type].map((tier) => (
                  <option key={tier} value={tier}>
                    {tierLabel(tier)}
                  </option>
                ))}
              </select>
              {service.status === "cancelled" || service.status === "paused" ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => changeStatus(service, "active")}
                  className={buttonSecondary}
                >
                  {busyId === service.id ? "Working..." : "Restart"}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => changeStatus(service, "paused")}
                    className={buttonSecondary}
                  >
                    {busyId === service.id ? "Working..." : "Pause"}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => changeStatus(service, "cancelled")}
                    className="cursor-pointer rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-red-300 transition-colors hover:bg-red-500/15 disabled:cursor-default disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        ))}

        {unassignedTypes.length > 0 && (
          <form
            onSubmit={assign}
            className="flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-white/15 p-4"
          >
            <label className="flex flex-col gap-1.5 text-sm text-white/80">
              Add service
              <select
                value={assignType}
                onChange={(e) => {
                  setAssignType(e.target.value as ServiceType | "");
                  setAssignTier("");
                }}
                className={`${adminInputClass} cursor-pointer`}
              >
                <option value="">Choose...</option>
                {unassignedTypes.map((type) => (
                  <option key={type} value={type}>
                    {SERVICE_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-white/80">
              Tier
              <select
                value={assignTier}
                onChange={(e) => setAssignTier(e.target.value)}
                disabled={!assignType}
                className={`${adminInputClass} cursor-pointer disabled:opacity-50`}
              >
                <option value="">Choose...</option>
                {assignType &&
                  SERVICE_TIERS[assignType].map((tier) => (
                    <option key={tier} value={tier}>
                      {tierLabel(tier)}
                    </option>
                  ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={pending || !assignType || !assignTier}
              className="cursor-pointer rounded-xl bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-all duration-200 hover:bg-[var(--primary-hover)] disabled:cursor-default disabled:opacity-50"
            >
              {pending ? "Assigning..." : "Assign"}
            </button>
          </form>
        )}
      </div>
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
    <div className="rounded-2xl border border-white/10 bg-surface p-6">
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

  const disabled = client.status === "disabled";
  const name = `${client.first_name} ${client.last_name}`;

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
          ? { kind: "ok", text: disabled ? "Account re-enabled." : "Account disabled." }
          : { kind: "error", text: result.error },
      );
    });
  }

  function remove() {
    const confirmed = window.confirm(
      `Permanently delete ${name}?\n\nThis removes their sign-in, profile, services, and invitations everywhere. This cannot be undone.`,
    );
    if (!confirmed) return;
    setNotice(null);
    startTransition(async () => {
      const result = await deleteClientAction(client.id);
      if (!result.ok) {
        setNotice({ kind: "error", text: result.error });
        return;
      }
      router.push("/admin-dashboard?tab=clients");
    });
  }

  return (
    <div className="rounded-2xl border border-red-500/20 bg-surface p-6">
      <h2 className="text-lg font-bold text-white">Account Controls</h2>
      <div className="mt-4 space-y-3">
        <NoticeBanner notice={notice} />
        <div className="flex flex-wrap gap-3">
          {(client.user_id || disabled) && (
            <button type="button" disabled={pending} onClick={toggleStatus} className={buttonSecondary}>
              {disabled ? "Re-enable Account" : "Disable Account"}
            </button>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={remove}
            className="cursor-pointer rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-red-300 transition-colors hover:bg-red-500/15 disabled:cursor-default disabled:opacity-50"
          >
            Delete Client
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phase 5: billing card. Per-service rails (R22), record-payment flow, and
// the append-only manual payment ledger.
// ---------------------------------------------------------------------------

function BillingServiceRow({ service }: { service: Tables<"services"> }) {
  const [notice, setNotice] = useState<Notice>(null);
  const [pending, startTransition] = useTransition();
  const [method, setMethod] = useState<"stripe" | "manual">(service.billing_method);
  const [cycle, setCycle] = useState<BillingInterval>(service.billing_interval);
  const [amount, setAmount] = useState(
    service.monthly_amount_cents != null ? (service.monthly_amount_cents / 100).toFixed(2) : "",
  );
  const [dueOn, setDueOn] = useState(service.next_due_on ?? "");

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

  function saveBilling() {
    setNotice(null);
    const cents = amount.trim() ? Math.round(Number.parseFloat(amount) * 100) : null;
    if (amount.trim() && (!Number.isFinite(cents) || cents! <= 0)) {
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
        billingInterval: cycle,
        monthlyAmountCents: cents,
        nextDueOn: dueOn,
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

  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-background p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-bold text-white">{SERVICE_TYPE_LABELS[service.service_type]}</span>
          <ServiceStatusBadge status={service.status} />
        </div>
        <span className="text-xs uppercase tracking-widest text-white/40">
          {service.billing_method === "stripe"
            ? service.stripe_subscription_id
              ? "Card on file — pays automatically"
              : "Card payments chosen — card not set up yet"
            : "Paid by e-Transfer / cheque / cash"}
        </span>
      </div>

      {service.billing_method === "stripe" && service.next_due_on && (
        <p className="text-xs text-white/45">Next automatic payment: {service.next_due_on}</p>
      )}
      {service.billing_method === "stripe" && !service.stripe_subscription_id && (
        <p className="text-xs text-white/45">
          The client sees a &ldquo;Set up automatic payments&rdquo; button on
          their dashboard until they enter their card.
        </p>
      )}

      <NoticeBanner notice={notice} />

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-sm text-white/80">
          How they pay
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as "stripe" | "manual")}
            className={`${adminInputClass} cursor-pointer`}
          >
            <option value="stripe">Automatic card payments</option>
            <option value="manual">e-Transfer / cheque / cash</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-white/80">
          Billed
          <select
            value={cycle}
            onChange={(e) => setCycle(e.target.value as BillingInterval)}
            className={`${adminInputClass} cursor-pointer`}
          >
            {(Object.keys(BILLING_INTERVAL_LABELS) as BillingInterval[]).map((value) => (
              <option key={value} value={value}>
                {BILLING_INTERVAL_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-white/80">
          Monthly rate ($, before tax)
          <input
            inputMode="decimal"
            placeholder="34.95"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={adminInputClass}
          />
        </label>
        {method === "manual" && (
          <label className="flex flex-col gap-1.5 text-sm text-white/80">
            Next payment due
            <input
              type="date"
              value={dueOn}
              onChange={(e) => setDueOn(e.target.value)}
              className={adminInputClass}
            />
          </label>
        )}
        <button type="button" disabled={pending} onClick={saveBilling} className={buttonSecondary}>
          {pending ? "Saving..." : "Save Billing"}
        </button>
        {cycle === "annual" && amount.trim() && Number.isFinite(Number.parseFloat(amount)) && (
          <p className="w-full text-xs text-white/40">
            Yearly invoice: ${(Number.parseFloat(amount) * 12).toFixed(2)} plus tax
            (monitoring is billed once a year).
          </p>
        )}
      </div>

      {service.billing_method === "manual" && (
        <form
          onSubmit={recordPayment}
          className="flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-emerald-500/25 bg-emerald-500/5 p-4"
        >
          <p className="w-full text-xs font-bold uppercase tracking-widest text-emerald-300">
            Record a received payment
          </p>
          <label className="flex flex-col gap-1.5 text-sm text-white/80">
            Amount ($)
            <input
              inputMode="decimal"
              required
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className={adminInputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-white/80">
            Method
            <select
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
              className={`${adminInputClass} cursor-pointer`}
            >
              {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-white/80">
            Received on
            <input
              type="date"
              required
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              className={adminInputClass}
            />
          </label>
          <label className="flex min-w-[12rem] flex-1 flex-col gap-1.5 text-sm text-white/80">
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

function BillingCard({
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
  // card payments side by side — the same view the client sees.
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
    <div className="rounded-2xl border border-white/10 bg-surface p-6">
      <h2 className="text-lg font-bold text-white">Billing</h2>
      <p className="mt-1 text-xs text-white/40">
        Clients either pay automatically by card, or pay you directly and you
        record it here. Recorded payments can&apos;t be edited afterwards — if
        you make a mistake, record a correcting entry (a negative amount works).
      </p>

      <div className="mt-4 space-y-4">
        {client.services.length === 0 && (
          <p className="rounded-xl border border-white/10 bg-background p-4 text-sm text-white/40">
            Assign a service first, then set up its billing.
          </p>
        )}
        {client.services.map((service) => (
          <BillingServiceRow key={service.id} service={service} />
        ))}

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
                    {payment.note && <span className="text-white/40"> &mdash; {payment.note}</span>}
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
    <div className="rounded-2xl border border-white/10 bg-surface p-6">
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
                        : "Client notification email NOT confirmed — follow up manually."}
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
// Phase 4: devices card. Admin sets install dates; expiry is computed
// (battery +5y, smoke +10y) and a date change re-arms the expiry alert (R14).
// ---------------------------------------------------------------------------

function DevicesCard({
  client,
  devices,
}: {
  client: AdminClientDetailRow;
  devices: Tables<"devices">[];
}) {
  const [notice, setNotice] = useState<Notice>(null);
  const [pending, startTransition] = useTransition();
  const [dates, setDates] = useState<Record<DeviceType, string>>(() => ({
    battery: devices.find((d) => d.device_type === "battery")?.installed_on ?? "",
    smoke_detector: devices.find((d) => d.device_type === "smoke_detector")?.installed_on ?? "",
  }));

  function save(deviceType: DeviceType) {
    const installedOn = dates[deviceType];
    if (!installedOn) {
      setNotice({ kind: "error", text: "Pick the install (or replacement) date first." });
      return;
    }
    setNotice(null);
    startTransition(async () => {
      const result = await setDeviceInstallDate({ profileId: client.id, deviceType, installedOn });
      setNotice(
        result.ok
          ? { kind: "ok", text: `${DEVICE_LABELS[deviceType]} date saved. Expiry alerts are re-armed.` }
          : { kind: "error", text: result.error },
      );
    });
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-surface p-6">
      <h2 className="text-lg font-bold text-white">Devices</h2>
      <p className="mt-1 text-xs text-white/40">
        Set the install/replacement date after each site visit. Batteries are
        flagged after {DEVICE_LIFETIME_YEARS.battery} years, smoke detectors
        after {DEVICE_LIFETIME_YEARS.smoke_detector}. When one comes due, the
        system automatically emails both the client and the McKee inbox.
      </p>

      <div className="mt-4 space-y-3">
        <NoticeBanner notice={notice} />
        <div className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(DEVICE_LABELS) as DeviceType[]).map((deviceType) => {
            const existing = devices.find((d) => d.device_type === deviceType);
            const expired = existing ? isDeviceExpired(deviceType, existing.installed_on) : false;
            return (
              <div
                key={deviceType}
                className={`rounded-xl border p-4 ${
                  expired ? "border-amber-500/40 bg-amber-500/10" : "border-white/10 bg-background"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-white">{DEVICE_LABELS[deviceType]}</p>
                  {expired && (
                    <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-300">
                      Replacement due
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-white/50">
                  {existing
                    ? `Installed ${existing.installed_on} · due ${deviceExpiryDate(deviceType, existing.installed_on).toLocaleDateString("en-CA", { year: "numeric", month: "short" })}`
                    : "Not tracked yet."}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    value={dates[deviceType]}
                    onChange={(e) => setDates((d) => ({ ...d, [deviceType]: e.target.value }))}
                    className={adminInputClass}
                    aria-label={`${DEVICE_LABELS[deviceType]} install date`}
                  />
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => save(deviceType)}
                    className={buttonSecondary}
                  >
                    {pending ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
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
      <ServicesCard client={client} />
      <BillingCard client={client} manualPayments={manualPayments} cardPayments={cardPayments} />
      <CallerIdCard client={client} contacts={callerIdContacts} changes={callerIdChanges} />
      <DevicesCard client={client} devices={devices} />
      <InvitationCard client={client} />
      <DangerZone client={client} />
    </div>
  );
}
