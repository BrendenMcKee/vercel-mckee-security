"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Tables } from "@/lib/portal/database.types";
import {
  createClientAction,
  deleteClientAction,
  resendInviteAction,
  type CreateClientInput,
} from "@/lib/portal/actions/clients";
import { LANVAC_CONTACT_NAME_MAX, LANVAC_PASSCODE_MAX } from "@/lib/portal/lanvac";
import {
  CLOUD_BACKUP_PLANNED_RETENTION_COPY,
  SERVICE_THEME,
  SERVICE_TIERS,
  SERVICE_TYPE_LABELS,
  isServiceAvailable,
  serviceChipClass,
  tierLabel,
  type ServiceType,
} from "@/lib/portal/service-labels";
import {
  formatCents,
  tierOptionLabel,
  voipCoverageLabel,
  voipMonthlyCents,
  voipPortFeeCents,
  withHstCents,
} from "@/lib/portal/billing";
import {
  DEVICE_CATEGORIES,
  DEVICE_CATEGORY_LABELS,
  type DeviceCategory,
} from "@/lib/portal/devices";
import { formatPhone, normalizePhone } from "@/lib/portal/phone";
import { adminInputClass, adminSelectClass, ProfileStatusBadge } from "@/components/admin-portal/ui";
import { DatePickerInput } from "@/components/portal/date-picker-input";
import { DeviceNameSelect } from "@/components/portal/device-name-select";

type DraftContact = { label: string; phone: string; passcode: string };
type DraftDevice = {
  label: string;
  category: DeviceCategory;
  installedOn: string;
  lifetimeYears: number;
};

type InvitationSummary = Pick<
  Tables<"invitations">,
  "id" | "target_email" | "expires_at" | "used_at" | "created_at"
>;

export type AdminClientRow = Tables<"profiles"> & {
  services: Tables<"services">[];
  invitations: InvitationSummary[];
};

const EMPTY_FORM: CreateClientInput = {
  firstName: "",
  lastName: "",
  email: "",
  address: "",
  phone: "",
  monitoringTier: "",
  cloudTier: "",
  voipTier: "",
  voipNumbers: 1,
  voipSeats: 1,
  voipPorts: 0,
  billingMethod: "stripe",
  lanvacAccountCode: "",
  lanvacCity: "",
};

const PAGE_SIZE = 25;
const CLOUD_BACKUP_AVAILABLE = isServiceAvailable("cloud_backup");

type SortKey = "name" | "email" | "status" | "created";
type SortDir = "asc" | "desc";

function inviteState(client: AdminClientRow): {
  label: string;
  tone: "ok" | "warn" | "muted";
  canResend: boolean;
} {
  if (client.status !== "pending") {
    return { label: "Activated", tone: "muted", canResend: false };
  }
  const open = client.invitations.find((inv) => !inv.used_at);
  if (!open) return { label: "No invite", tone: "warn", canResend: true };
  const msLeft = new Date(open.expires_at).getTime() - Date.now();
  if (msLeft <= 0) return { label: "Invite expired", tone: "warn", canResend: true };
  const days = Math.ceil(msLeft / 86400_000);
  return { label: `Invited · ${days}d left`, tone: "ok", canResend: true };
}

const SERVICE_CHIP_LABELS: Record<string, string> = {
  monitoring: "Monitoring",
  cloud_backup: "Cloud",
  voip: "VoIP",
};

function serviceChips(services: Tables<"services">[]): { key: string; label: string; type: string }[] {
  return services.map((s) => ({
    key: s.id,
    type: s.service_type,
    label: `${SERVICE_CHIP_LABELS[s.service_type] ?? s.service_type} · ${tierLabel(s.tier)}${s.status !== "active" ? ` (${s.status})` : ""}`,
  }));
}

function compare(a: AdminClientRow, b: AdminClientRow, key: SortKey): number {
  switch (key) {
    case "name":
      return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
    case "email":
      return (a.email ?? "").localeCompare(b.email ?? "");
    case "status":
      return a.status.localeCompare(b.status);
    case "created":
      return a.created_at.localeCompare(b.created_at);
  }
}

export function AdminClientsPanel({ clients }: { clients: AdminClientRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | Tables<"profiles">["status"]>("");
  const [serviceFilter, setServiceFilter] = useState<"" | ServiceType | "none">("");
  const [tierFilter, setTierFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateClientInput>(EMPTY_FORM);
  const [draftContacts, setDraftContacts] = useState<DraftContact[]>([]);
  const [contactDraft, setContactDraft] = useState<DraftContact>({ label: "", phone: "", passcode: "" });
  const [draftDevices, setDraftDevices] = useState<DraftDevice[]>([]);
  const [deviceDraft, setDeviceDraft] = useState({
    label: "",
    category: "other" as DeviceCategory,
    installedOn: "",
    years: "5",
  });
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string; link?: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = clients;
    if (q) {
      rows = rows.filter(
        (c) =>
          `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
          (c.email ?? "").toLowerCase().includes(q),
      );
    }
    if (statusFilter) rows = rows.filter((c) => c.status === statusFilter);
    if (serviceFilter === "none") {
      rows = rows.filter((c) => c.services.length === 0);
    } else if (serviceFilter) {
      rows = rows.filter((c) => c.services.some((s) => s.service_type === serviceFilter));
    }
    if (tierFilter) {
      rows = rows.filter((c) =>
        c.services.some(
          (s) => s.tier === tierFilter && (serviceFilter === "" || serviceFilter === "none" || s.service_type === serviceFilter),
        ),
      );
    }
    const sorted = [...rows].sort((a, b) => {
      const result = compare(a, b, sortKey);
      return sortDir === "asc" ? result : -result;
    });
    return sorted;
  }, [clients, search, statusFilter, serviceFilter, tierFilter, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const tierOptions =
    serviceFilter && serviceFilter !== "none"
      ? SERVICE_TIERS[serviceFilter]
      : [
          ...SERVICE_TIERS.monitoring,
          ...SERVICE_TIERS.voip,
          ...(CLOUD_BACKUP_AVAILABLE ? SERVICE_TIERS.cloud_backup : []),
        ];

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "created" ? "desc" : "asc");
    }
    setPage(0);
  }

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return null;
    return <span aria-hidden="true"> {sortDir === "asc" ? "▲" : "▼"}</span>;
  }

  function set<K extends keyof CreateClientInput>(key: K, value: CreateClientInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === "monitoringTier" && !value) {
      setDraftContacts([]);
      setContactDraft({ label: "", phone: "", passcode: "" });
      setDraftDevices([]);
      setDeviceDraft({ label: "", category: "other", installedOn: "", years: "5" });
    }
  }

  function resetCreateForm() {
    setForm(EMPTY_FORM);
    setDraftContacts([]);
    setContactDraft({ label: "", phone: "", passcode: "" });
    setDraftDevices([]);
    setDeviceDraft({ label: "", category: "other", installedOn: "", years: "5" });
  }

  function addDraftContact() {
    const label = contactDraft.label.trim();
    const passcode = contactDraft.passcode.trim();
    const phone = normalizePhone(contactDraft.phone);
    if (!label || !passcode || !phone) {
      setNotice({
        kind: "error",
        text: "Each alarm contact needs a name, a valid phone number, and their passcode.",
      });
      return;
    }
    if (label.length > LANVAC_CONTACT_NAME_MAX) {
      setNotice({ kind: "error", text: `Contact name is too long (${LANVAC_CONTACT_NAME_MAX} max).` });
      return;
    }
    if (passcode.length > LANVAC_PASSCODE_MAX) {
      setNotice({ kind: "error", text: `Passcode is too long (${LANVAC_PASSCODE_MAX} max).` });
      return;
    }
    if (draftContacts.length >= 15) {
      setNotice({ kind: "error", text: "The alarm contact list is capped at 15 people." });
      return;
    }
    if (draftContacts.some((c) => c.phone === phone && c.label === label && c.passcode === passcode)) {
      setNotice({ kind: "error", text: "That person is already on this list." });
      return;
    }
    setDraftContacts((prev) => [...prev, { label, phone, passcode }]);
    setContactDraft({ label: "", phone: "", passcode: "" });
    setNotice(null);
  }

  function addDraftDevice() {
    const label = deviceDraft.label.trim();
    const lifetimeYears = Number.parseInt(deviceDraft.years, 10);
    if (!label || !deviceDraft.installedOn || !Number.isFinite(lifetimeYears) || lifetimeYears < 1) {
      setNotice({
        kind: "error",
        text: "Give the device a name, an install date, and how many years until replacement.",
      });
      return;
    }
    setDraftDevices((prev) => [
      ...prev,
      { label, category: deviceDraft.category, installedOn: deviceDraft.installedOn, lifetimeYears },
    ]);
    setDeviceDraft({ label: "", category: "other", installedOn: "", years: "5" });
    setNotice(null);
  }

  function submitCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    let contacts = draftContacts;
    const pendingLabel = contactDraft.label.trim();
    const pendingPasscode = contactDraft.passcode.trim();
    const pendingPhone = normalizePhone(contactDraft.phone);
    if (form.monitoringTier && (pendingLabel || pendingPasscode || contactDraft.phone.trim())) {
      if (!pendingLabel || !pendingPasscode || !pendingPhone) {
        setNotice({
          kind: "error",
          text: "Finish the alarm contact (name, phone, and passcode) or clear those fields before creating the client.",
        });
        return;
      }
      if (contacts.some((c) => c.phone === pendingPhone)) {
        setNotice({ kind: "error", text: "That phone number is already on this list." });
        return;
      }
      if (contacts.length >= 15) {
        setNotice({ kind: "error", text: "The alarm contact list is capped at 15 people." });
        return;
      }
      contacts = [...contacts, { label: pendingLabel, phone: pendingPhone, passcode: pendingPasscode }];
    }

    let devices = draftDevices;
    if (
      form.monitoringTier &&
      (deviceDraft.label.trim() || deviceDraft.installedOn)
    ) {
      const lifetimeYears = Number.parseInt(deviceDraft.years, 10);
      if (!deviceDraft.label.trim() || !deviceDraft.installedOn || !Number.isFinite(lifetimeYears) || lifetimeYears < 1) {
        setNotice({
          kind: "error",
          text: "Finish the device (name, install date, and years) or clear those fields before creating the client.",
        });
        return;
      }
      devices = [
        ...devices,
        {
          label: deviceDraft.label.trim(),
          category: deviceDraft.category,
          installedOn: deviceDraft.installedOn,
          lifetimeYears,
        },
      ];
    }

    startTransition(async () => {
      const result = await createClientAction(form, {
        contacts: form.monitoringTier ? contacts : [],
        devices: form.monitoringTier ? devices : [],
      });
      if (!result.ok) {
        setNotice({ kind: "error", text: result.error });
        return;
      }
      resetCreateForm();
      setShowForm(false);
      const seedNote = result.warning ? ` ${result.warning}` : "";
      if (!result.emailAttempted) {
        setNotice({
          kind: "ok",
          text: `Client created. There is no email on file, so copy the activation link and deliver it yourself:${seedNote}`,
          link: result.activateUrl,
        });
      } else if (!result.emailSent) {
        setNotice({
          kind: "error",
          text: `Client created, but the invitation email failed to send. Copy the link and deliver it yourself:${seedNote}`,
          link: result.activateUrl,
        });
      } else {
        setNotice({
          kind: result.warning ? "error" : "ok",
          text: `Client created and invitation email sent.${seedNote}`,
        });
      }
    });
  }

  function remove(client: AdminClientRow) {
    const name = `${client.first_name} ${client.last_name}`;
    // Destructive admin action (handover 14.2): type-to-confirm, verified
    // again on the server. Deleting erases the client everywhere and stops
    // any automatic card payments in Stripe first.
    const typed = window.prompt(
      `Permanently delete ${name}?\n\nThis erases their sign-in, profile, services, contact list, devices, payment history, and invitations, and stops any automatic card payments. This cannot be undone.\n\nTo confirm, type the client's full name exactly:`,
    );
    if (typed === null) return;
    if (typed.trim().replace(/\s+/g, " ").toLowerCase() !== name.trim().replace(/\s+/g, " ").toLowerCase()) {
      setNotice({ kind: "error", text: `The name you typed does not match ${name}. Nothing was deleted.` });
      return;
    }
    setNotice(null);
    setDeletingId(client.id);
    startTransition(async () => {
      const result = await deleteClientAction({ profileId: client.id, confirmName: typed });
      setDeletingId(null);
      if (!result.ok) {
        setNotice({ kind: "error", text: result.error });
        return;
      }
      setNotice({ kind: "ok", text: `${name} and all their data were deleted.` });
    });
  }

  function resend(profileId: string) {
    setNotice(null);
    setResendingId(profileId);
    startTransition(async () => {
      const result = await resendInviteAction(profileId);
      setResendingId(null);
      if (!result.ok) {
        setNotice({ kind: "error", text: result.error });
        return;
      }
      if (!result.emailAttempted) {
        setNotice({
          kind: "ok",
          text: "New invitation created. There is no email on file, so copy the activation link:",
          link: result.activateUrl,
        });
      } else if (!result.emailSent) {
        setNotice({
          kind: "error",
          text: "Invitation refreshed, but the email failed to send. Copy the link:",
          link: result.activateUrl,
        });
      } else {
        setNotice({ kind: "ok", text: "Invitation refreshed and email re-sent." });
      }
    });
  }

  const selectClass = adminSelectClass;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-white">Clients</h2>
        <button
          type="button"
          onClick={() => {
            setShowForm((v) => !v);
            setNotice(null);
          }}
          className="cursor-pointer rounded-xl bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-all duration-200 hover:bg-[var(--primary-hover)]"
        >
          {showForm ? "Close" : "New Client"}
        </button>
      </div>

      <div className="space-y-3">
        <input
          type="search"
          placeholder="Search name or email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className={`${adminInputClass} w-full sm:max-w-sm`}
        />
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as typeof statusFilter);
              setPage(0);
            }}
            className={`${selectClass} max-w-full`}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="disabled">Disabled</option>
          </select>
          <select
            value={serviceFilter}
            onChange={(e) => {
              setServiceFilter(e.target.value as typeof serviceFilter);
              setTierFilter("");
              setPage(0);
            }}
            className={`${selectClass} max-w-full`}
            aria-label="Filter by service"
          >
            <option value="">All services</option>
            <option value="monitoring">{SERVICE_TYPE_LABELS.monitoring}</option>
            <option value="voip">{SERVICE_TYPE_LABELS.voip}</option>
            <option value="cloud_backup" disabled={!CLOUD_BACKUP_AVAILABLE}>
              {SERVICE_TYPE_LABELS.cloud_backup}
              {!CLOUD_BACKUP_AVAILABLE ? " (In Development)" : ""}
            </option>
            <option value="none">No services</option>
          </select>
          {serviceFilter !== "none" && (
            <select
              value={tierFilter}
              onChange={(e) => {
                setTierFilter(e.target.value);
                setPage(0);
              }}
              className={`${selectClass} max-w-full`}
              aria-label="Filter by tier"
            >
              <option value="">All tiers</option>
              {tierOptions.map((tier) => (
                <option key={tier} value={tier}>
                  {tierLabel(tier)}
                </option>
              ))}
            </select>
          )}
          <span className="text-xs text-white/40">
            {filtered.length} of {clients.length}
          </span>
        </div>
      </div>

      {notice && (
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
                className="cursor-pointer rounded-lg border border-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white/80 hover:bg-white/10"
              >
                Copy
              </button>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={submitCreate}
          className="space-y-6 rounded-2xl border border-white/10 bg-surface p-5 sm:p-6"
        >
          <fieldset className="space-y-3">
            <legend className="text-xs font-bold uppercase tracking-widest text-white/40">
              Client Details
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm text-white/80">
                First name *
                <input
                  required
                  value={form.firstName}
                  onChange={(e) => set("firstName", e.target.value)}
                  className={adminInputClass}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm text-white/80">
                Last name *
                <input
                  required
                  value={form.lastName}
                  onChange={(e) => set("lastName", e.target.value)}
                  className={adminInputClass}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm text-white/80">
                Email *
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  className={adminInputClass}
                />
                <span className="text-xs text-white/40">
                  Required. The invitation, receipts, and reminders go here. This is also their sign-in email.
                </span>
              </label>
              <label className="flex flex-col gap-1.5 text-sm text-white/80">
                Phone number
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="(705) 555-0123"
                  className={adminInputClass}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm text-white/80 sm:col-span-2">
                Service address
                <input
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                  className={adminInputClass}
                />
                <span className="text-xs text-white/40">
                  Optional here. The site we monitor or install at. Stripe does not need it; the client can add it in Settings.
                </span>
              </label>
              <label className="flex flex-col gap-1.5 text-sm text-white/80">
                Lanvac account
                <input
                  value={form.lanvacAccountCode}
                  onChange={(e) => set("lanvacAccountCode", e.target.value)}
                  placeholder="O5985"
                  maxLength={6}
                  className={adminInputClass}
                />
                <span className="text-xs text-white/40">
                  Optional. The CODE from the station export, including the leading letter.
                </span>
              </label>
              <label className="flex flex-col gap-1.5 text-sm text-white/80">
                Dispatch city
                <input
                  value={form.lanvacCity}
                  onChange={(e) => set("lanvacCity", e.target.value)}
                  placeholder="Haliburton - On"
                  maxLength={240}
                  className={adminInputClass}
                />
                <span className="text-xs text-white/40">
                  Exact city spelling from the Lanvac export. Police, fire, and ambulance come from this, not the people list.
                </span>
              </label>
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-xs font-bold uppercase tracking-widest text-white/40">
              Services
            </legend>
            <p className="text-xs text-white/40">
              Pick the plans this client is signing up for. Any service can also be added later
              from their detail page.
            </p>
            <div className="grid gap-3 lg:grid-cols-3">
              <div className={`space-y-3 rounded-xl border bg-black/20 p-4 ${SERVICE_THEME.monitoring.card}`}>
                <p className="text-sm font-bold text-white">
                  {SERVICE_TYPE_LABELS.monitoring}
                </p>
                <p className="text-xs text-white/40">
                  Monthly rate, billed annually (one invoice a year).
                </p>
                <label className="flex flex-col gap-1.5 text-sm text-white/80">
                  Plan
                  <select
                    value={form.monitoringTier}
                    onChange={(e) => set("monitoringTier", e.target.value as CreateClientInput["monitoringTier"])}
                    className={selectClass}
                  >
                    <option value="">None</option>
                    {SERVICE_TIERS.monitoring.map((tier) => (
                      <option key={tier} value={tier}>
                        {tierOptionLabel("monitoring", tier)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className={`space-y-3 rounded-xl border bg-black/20 p-4 ${SERVICE_THEME.voip.card}`}>
                <p className="text-sm font-bold text-white">{SERVICE_TYPE_LABELS.voip}</p>
                <p className="text-xs text-white/40">
                  One monthly amount for the whole system. First number and first
                  seat are included. Phones add nothing. Always billed monthly,
                  never folded into an installation invoice.
                </p>
                <label className="flex flex-col gap-1.5 text-sm text-white/80">
                  Plan
                  <select
                    value={form.voipTier}
                    onChange={(e) => {
                      const tier = e.target.value as CreateClientInput["voipTier"];
                      set("voipTier", tier);
                      if (tier === "residential") set("voipSeats", 1);
                    }}
                    className={selectClass}
                  >
                    <option value="">None</option>
                    {SERVICE_TIERS.voip.map((tier) => (
                      <option key={tier} value={tier}>
                        {tierOptionLabel("voip", tier)}
                      </option>
                    ))}
                  </select>
                </label>
                <label
                  className={`flex flex-col gap-1.5 text-sm transition-opacity ${form.voipTier ? "text-white/80" : "pointer-events-none opacity-40"}`}
                >
                  Phone numbers
                  <input
                    type="number"
                    min={1}
                    max={100}
                    disabled={!form.voipTier}
                    value={form.voipNumbers}
                    onChange={(e) => {
                      const next = Math.max(1, Number.parseInt(e.target.value, 10) || 1);
                      set("voipNumbers", next);
                      if (form.voipPorts > next) set("voipPorts", next);
                    }}
                    className={adminInputClass}
                  />
                  <span className="text-xs text-white/40">
                    First number is included. Each extra is $4.99 / month on either plan.
                  </span>
                </label>
                <label
                  className={`flex flex-col gap-1.5 text-sm transition-opacity ${
                    form.voipTier === "professional" ? "text-white/80" : "pointer-events-none opacity-40"
                  }`}
                >
                  User seats
                  <input
                    type="number"
                    min={1}
                    max={100}
                    disabled={form.voipTier !== "professional"}
                    value={form.voipTier === "residential" ? 1 : form.voipSeats}
                    onChange={(e) => set("voipSeats", Math.max(1, Number.parseInt(e.target.value, 10) || 1))}
                    className={adminInputClass}
                  />
                  <span className="text-xs text-white/40">
                    {form.voipTier === "residential"
                      ? "Residential has no seat add-on."
                      : "First seat is included. Each extra is $24.99 / month. Commercial only."}
                  </span>
                </label>
                <label
                  className={`flex flex-col gap-1.5 text-sm transition-opacity ${form.voipTier ? "text-white/80" : "pointer-events-none opacity-40"}`}
                >
                  Numbers to port (one-time)
                  <input
                    type="number"
                    min={0}
                    max={form.voipNumbers}
                    disabled={!form.voipTier}
                    value={form.voipPorts}
                    onChange={(e) =>
                      set("voipPorts", Math.min(form.voipNumbers, Math.max(0, Number.parseInt(e.target.value, 10) || 0)))
                    }
                    className={adminInputClass}
                  />
                  <span className="text-xs text-white/40">
                    $49.99 per number, one time. Not part of the monthly subscription.
                  </span>
                </label>
                {form.voipTier && (
                  <p className="text-xs leading-relaxed text-white/55">
                    Monthly:{" "}
                    <span className="font-semibold text-white">
                      {formatCents(
                        voipMonthlyCents({
                          tier: form.voipTier,
                          numberCount: form.voipNumbers,
                          seatCount: form.voipTier === "professional" ? form.voipSeats : 1,
                        }),
                      )}{" "}
                      plus tax
                    </span>{" "}
                    ({voipCoverageLabel({
                      tier: form.voipTier,
                      numberCount: form.voipNumbers,
                      seatCount: form.voipTier === "professional" ? form.voipSeats : 1,
                    })}
                    , {formatCents(
                      withHstCents(
                        voipMonthlyCents({
                          tier: form.voipTier,
                          numberCount: form.voipNumbers,
                          seatCount: form.voipTier === "professional" ? form.voipSeats : 1,
                        }),
                      ),
                    )}{" "}
                    with HST)
                    {form.voipPorts > 0
                      ? `. Port fee ${formatCents(voipPortFeeCents(form.voipPorts))} plus tax, charged separately.`
                      : ""}
                  </p>
                )}
              </div>

              <div
                aria-disabled={!CLOUD_BACKUP_AVAILABLE}
                className={`space-y-3 rounded-xl border p-4 ${
                  CLOUD_BACKUP_AVAILABLE
                    ? "border-white/10 bg-black/20"
                    : "border-dashed border-white/10 bg-white/2.5 opacity-75"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-white">
                    {SERVICE_TYPE_LABELS.cloud_backup}
                  </p>
                  {!CLOUD_BACKUP_AVAILABLE && (
                    <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white/65">
                      In Development
                    </span>
                  )}
                </div>
                <p className="text-xs leading-relaxed text-white/45">
                  {CLOUD_BACKUP_AVAILABLE
                    ? "Choose how long camera footage is retained off-site."
                    : `Planned retention options: ${CLOUD_BACKUP_PLANNED_RETENTION_COPY}. Assignment and billing unlock after Track 2 launches.`}
                </p>
                <label className="flex flex-col gap-1.5 text-sm text-white/80">
                  Plan
                  <select
                    value={form.cloudTier}
                    onChange={(e) => set("cloudTier", e.target.value as CreateClientInput["cloudTier"])}
                    disabled={!CLOUD_BACKUP_AVAILABLE}
                    className={`${selectClass} disabled:cursor-not-allowed disabled:text-white/40`}
                  >
                    <option value="">
                      {CLOUD_BACKUP_AVAILABLE ? "None" : "Available after launch"}
                    </option>
                    {SERVICE_TIERS.cloud_backup.map((tier) => (
                      <option key={tier} value={tier}>
                        {tierOptionLabel("cloud_backup", tier)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </fieldset>

          {form.monitoringTier && (
            <>
              <fieldset className="space-y-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                <legend className="px-1 text-xs font-bold uppercase tracking-widest text-red-200">
                  Alarm contact list
                </legend>
                <p className="text-xs text-white/45">
                  Optional now. Add the people the monitoring station should call. Do not add
                  police, fire, or ambulance here. Those come from the dispatch city. You can
                  finish this later on the client page.
                </p>
                </p>
                {draftContacts.length > 0 && (
                  <ul className="space-y-2">
                    {draftContacts.map((contact, index) => (
                      <li
                        key={`${contact.phone}-${contact.label}-${index}`}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-background px-3 py-2 text-sm"
                      >
                        <span className="text-white">
                          <span className="font-bold tabular-nums text-white/70">#{index + 1}</span>{" "}
                          {contact.label}{" "}
                          <span className="text-white/50">{formatPhone(contact.phone)}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setDraftContacts((prev) => prev.filter((_, i) => i !== index))}
                          className="cursor-pointer text-xs font-bold uppercase tracking-wide text-white/50 hover:text-white"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="flex flex-col gap-1.5 text-sm text-white/80">
                    Name / relation
                    <input
                      value={contactDraft.label}
                      onChange={(e) => setContactDraft((prev) => ({ ...prev, label: e.target.value }))}
                      placeholder="e.g. Sarah (daughter)"
                      maxLength={LANVAC_CONTACT_NAME_MAX}
                      className={adminInputClass}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm text-white/80">
                    Phone number
                    <input
                      value={contactDraft.phone}
                      onChange={(e) => setContactDraft((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="(705) 555-0123"
                      className={adminInputClass}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm text-white/80">
                    Passcode
                    <input
                      value={contactDraft.passcode}
                      onChange={(e) => setContactDraft((prev) => ({ ...prev, passcode: e.target.value }))}
                      placeholder="Their verification word"
                      maxLength={LANVAC_PASSCODE_MAX}
                      className={adminInputClass}
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={addDraftContact}
                  className="cursor-pointer rounded-lg border border-white/20 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white/80 hover:bg-white/10"
                >
                  Add contact
                </button>
              </fieldset>

              <fieldset className="space-y-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                <legend className="px-1 text-xs font-bold uppercase tracking-widest text-red-200">
                  Devices
                </legend>
                <p className="text-xs text-white/45">
                  Optional now. Name them however you need (hallway smoke 1, bedroom
                  smoke). Filter later by category, not by name. A wireless smoke or
                  CO detector is two rows: the detector itself, and its battery.
                </p>
                {draftDevices.length > 0 && (
                  <ul className="space-y-2">
                    {draftDevices.map((device, index) => (
                      <li
                        key={`${device.label}-${index}`}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-background px-3 py-2 text-sm"
                      >
                        <span className="text-white">
                          {device.label}{" "}
                          <span className="text-white/50">
                            · {DEVICE_CATEGORY_LABELS[device.category]} · installed {device.installedOn}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setDraftDevices((prev) => prev.filter((_, i) => i !== index))}
                          className="cursor-pointer text-xs font-bold uppercase tracking-wide text-white/50 hover:text-white"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="flex flex-col gap-1.5 text-sm text-white/80">
                    Device name
                    <DeviceNameSelect
                      value={deviceDraft.label}
                      onChange={(label, preset) =>
                        setDeviceDraft((prev) => ({
                          ...prev,
                          label,
                          category: preset?.category ?? prev.category,
                          years: preset ? String(preset.years) : prev.years,
                        }))
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm text-white/80">
                    Category
                    <select
                      value={deviceDraft.category}
                      onChange={(e) =>
                        setDeviceDraft((prev) => ({ ...prev, category: e.target.value as DeviceCategory }))
                      }
                      className={selectClass}
                    >
                      {DEVICE_CATEGORIES.map((value) => (
                        <option key={value} value={value}>
                          {DEVICE_CATEGORY_LABELS[value]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm text-white/80">
                    Installed on
                    <DatePickerInput
                      value={deviceDraft.installedOn}
                      onChange={(value) => setDeviceDraft((prev) => ({ ...prev, installedOn: value }))}
                      className={adminInputClass}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm text-white/80">
                    Replace every (years)
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={deviceDraft.years}
                      onChange={(e) => setDeviceDraft((prev) => ({ ...prev, years: e.target.value }))}
                      className={adminInputClass}
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={addDraftDevice}
                  className="cursor-pointer rounded-lg border border-white/20 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white/80 hover:bg-white/10"
                >
                  Add device
                </button>
              </fieldset>
            </>
          )}

          <fieldset className="space-y-3">
            <legend className="text-xs font-bold uppercase tracking-widest text-white/40">
              Billing
            </legend>
            <label className="flex max-w-md flex-col gap-1.5 text-sm text-white/80">
              How will they pay?
              <select
                value={form.billingMethod}
                onChange={(e) => set("billingMethod", e.target.value as CreateClientInput["billingMethod"])}
                className={selectClass}
              >
                <option value="stripe">Automatic card payments (recommended)</option>
                <option value="manual">e-Transfer / cheque / cash</option>
              </select>
              <span className="text-xs text-white/40">
                {form.billingMethod === "stripe"
                  ? "The client is asked for their card when they activate their account."
                  : "You will record payments by hand. The first invoice is due today (change it on their page if they are already paid ahead). Security is billed once a year; VoIP is billed every month."}
              </span>
            </label>
          </fieldset>

          <div>
            <button
              type="submit"
              disabled={pending}
              className="cursor-pointer rounded-xl bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wide text-white transition-all duration-200 hover:bg-[var(--primary-hover)] disabled:cursor-default disabled:opacity-50"
            >
              {pending ? "Creating..." : "Create Client & Send Invite"}
            </button>
          </div>
        </form>
      )}

      {/* Mobile: stacked cards. A six-column table can't work at 390px. */}
      <div className="space-y-3 md:hidden">
        {pageRows.length === 0 && (
          <p className="rounded-2xl border border-white/10 bg-surface px-4 py-8 text-center text-sm text-white/40">
            {clients.length === 0
              ? "No clients yet. Create the first one with New Client."
              : "No clients match your search or filters."}
          </p>
        )}
        {pageRows.map((client) => {
          const invite = inviteState(client);
          return (
            <div
              key={client.id}
              role="link"
              tabIndex={0}
              onClick={() => router.push(`/admin-dashboard/clients/${client.id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter") router.push(`/admin-dashboard/clients/${client.id}`);
              }}
              className="cursor-pointer rounded-2xl border border-white/10 bg-surface p-4 transition-colors active:bg-white/5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-bold text-white">
                    {client.first_name} {client.last_name}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-white/60">
                    {client.email ?? "No email"}
                  </p>
                </div>
                <ProfileStatusBadge status={client.status} />
              </div>
              {client.services.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {serviceChips(client.services).map((chip) => (
                    <span
                      key={chip.key}
                      className={`rounded-full border px-2.5 py-0.5 text-xs ${serviceChipClass(chip.type)}`}
                    >
                      {chip.label}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
                <span
                  className={`text-xs ${
                    invite.tone === "ok"
                      ? "text-emerald-300"
                      : invite.tone === "warn"
                        ? "text-amber-300"
                        : "text-white/30"
                  }`}
                >
                  {invite.label}
                </span>
                <div className="flex items-center gap-2">
                  {invite.canResend && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={(e) => {
                        e.stopPropagation();
                        resend(client.id);
                      }}
                      className="cursor-pointer rounded-lg border border-white/20 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white/80 transition-colors hover:bg-white/10 disabled:cursor-default disabled:opacity-50"
                    >
                      {resendingId === client.id ? "Sending..." : "Resend"}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={pending}
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(client);
                    }}
                    className="cursor-pointer rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-red-300 transition-colors hover:bg-red-500/15 disabled:cursor-default disabled:opacity-50"
                  >
                    {deletingId === client.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: full table. */}
      <div className="hidden overflow-x-auto rounded-2xl border border-white/10 bg-surface md:block">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-widest text-white/40">
              <th className="px-4 py-3 font-bold">
                <button type="button" onClick={() => toggleSort("name")} className="cursor-pointer uppercase tracking-widest hover:text-white">
                  Name{sortIndicator("name")}
                </button>
              </th>
              <th className="px-4 py-3 font-bold">
                <button type="button" onClick={() => toggleSort("email")} className="cursor-pointer uppercase tracking-widest hover:text-white">
                  Email{sortIndicator("email")}
                </button>
              </th>
              <th className="px-4 py-3 font-bold">
                <button type="button" onClick={() => toggleSort("status")} className="cursor-pointer uppercase tracking-widest hover:text-white">
                  Status{sortIndicator("status")}
                </button>
              </th>
              <th className="px-4 py-3 font-bold">Services</th>
              <th className="px-4 py-3 font-bold">Invitation</th>
              <th className="px-4 py-3 text-right font-bold">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-white/40">
                  {clients.length === 0
                    ? "No clients yet. Create the first one with New Client."
                    : "No clients match your search or filters."}
                </td>
              </tr>
            )}
            {pageRows.map((client) => {
              const invite = inviteState(client);
              return (
                <tr
                  key={client.id}
                  onClick={() => router.push(`/admin-dashboard/clients/${client.id}`)}
                  className="cursor-pointer border-b border-white/5 transition-colors last:border-0 hover:bg-white/5"
                >
                  <td className="px-4 py-3 font-bold text-white">
                    {client.first_name} {client.last_name}
                  </td>
                  <td className="px-4 py-3 text-white/70">{client.email ?? "No email"}</td>
                  <td className="px-4 py-3">
                    <ProfileStatusBadge status={client.status} />
                  </td>
                  <td className="px-4 py-3 text-white/70">
                    {client.services.length === 0 ? (
                      <span className="text-white/30">None</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {serviceChips(client.services).map((chip) => (
                          <span
                            key={chip.key}
                            className={`rounded-full border px-2.5 py-0.5 text-xs ${serviceChipClass(chip.type)}`}
                          >
                            {chip.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={
                          invite.tone === "ok"
                            ? "text-emerald-300"
                            : invite.tone === "warn"
                              ? "text-amber-300"
                              : "text-white/30"
                        }
                      >
                        {invite.label}
                      </span>
                      {invite.canResend && (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={(e) => {
                            e.stopPropagation();
                            resend(client.id);
                          }}
                          className="cursor-pointer rounded-lg border border-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white/80 transition-colors hover:bg-white/10 disabled:cursor-default disabled:opacity-50"
                        >
                          {resendingId === client.id ? "Sending..." : "Resend"}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={(e) => {
                        e.stopPropagation();
                        remove(client);
                      }}
                      className="cursor-pointer rounded-lg border border-red-500/30 px-3 py-1 text-xs font-bold uppercase tracking-wide text-red-300 transition-colors hover:bg-red-500/15 disabled:cursor-default disabled:opacity-50"
                    >
                      {deletingId === client.id ? "Deleting..." : "Delete"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between text-sm text-white/60">
          <button
            type="button"
            disabled={currentPage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="cursor-pointer rounded-lg border border-white/20 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white/80 transition-colors hover:bg-white/10 disabled:cursor-default disabled:opacity-40"
          >
            Previous
          </button>
          <span>
            Page {currentPage + 1} of {pageCount}
          </span>
          <button
            type="button"
            disabled={currentPage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            className="cursor-pointer rounded-lg border border-white/20 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white/80 transition-colors hover:bg-white/10 disabled:cursor-default disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
