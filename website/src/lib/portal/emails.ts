import "server-only";
import { buildBrandedSubject, sendEmail } from "@/lib/email";
import {
  buildBrandedEmailHtml,
  buildBrandedEmailText,
  escapeHtml,
  type EmailField,
} from "@/lib/email-templates";
import { siteConfig } from "@/lib/site-config";
import { formatPhone } from "@/lib/portal/phone";
import { recordPortalAlert } from "@/lib/portal/alerts";

/**
 * All portal emails dispatch through here so a failed send is never just a
 * log line: it lands in the admin Alerts tab (handover 22.3) with enough
 * context to retry manually. Returns sendEmail's semantics (true only when
 * a message was actually dispatched).
 */
async function dispatchPortalEmail(
  label: string,
  payload: Parameters<typeof sendEmail>[0],
): Promise<boolean> {
  try {
    const sent = await sendEmail(payload);
    if (!sent) {
      await recordPortalAlert("email_failure", `${label}: not sent (email service not configured).`, {
        subject: buildBrandedSubject(payload.subject),
        to: payload.to ?? "admin inbox",
      });
    }
    return sent;
  } catch (error) {
    console.error(`[portal] ${label} failed:`, error);
    await recordPortalAlert("email_failure", `${label}: send failed.`, {
      subject: buildBrandedSubject(payload.subject),
      to: payload.to ?? "admin inbox",
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

const PORTAL_FOOTER_HTML = `Sent by McKee Security &nbsp;&bull;&nbsp;
  <a href="${siteConfig.url}" style="color:#c91818;text-decoration:none;font-weight:600;">${siteConfig.url.replace("https://", "")}</a>
  &nbsp;&bull;&nbsp; (705) 457-2156`;

const PORTAL_FOOTER_TEXT = [
  `Sent by McKee Security | ${siteConfig.url} | (705) 457-2156`,
];

function formatExpiry(expiresAt: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Toronto",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(expiresAt));
  } catch {
    return new Date(expiresAt).toUTCString();
  }
}

/**
 * Account invitation (PORTAL_PLAN.md Section 8, Phase 2). Returns false when
 * the email could not be dispatched; callers surface that to the admin so the
 * invite link can be delivered manually (a failed send never rolls back the
 * created client).
 */
export async function sendInvitationEmail({
  to,
  firstName,
  activateUrl,
  expiresAt,
}: {
  to: string;
  firstName: string;
  activateUrl: string;
  expiresAt: string;
}): Promise<boolean> {
  const meta = {
    title: "Your portal is ready",
    inboxLabel: "A simpler way to manage your account",
  };

  const fields: EmailField[] = [
    {
      label: "Welcome",
      value: `Hi ${firstName},\n\nWe're making it easier to manage your McKee Security account. Your new secure portal gives you one place to review your services, manage billing, and keep important account information up to date.`,
    },
    {
      label: "Get started",
      value: "Set up your account to choose your preferred sign-in and access your portal. It only takes about a minute.",
      href: activateUrl,
      cta: true,
      buttonLabel: "Set Up My Account",
    },
    {
      label: "Secure link",
      value: `This link works until ${formatExpiry(expiresAt)} ET. Need a new one? Contact us and we'll send it.`,
    },
  ];

  return dispatchPortalEmail("Invitation email", {
    to,
    subject: "Your portal is ready",
    text: buildBrandedEmailText(meta, fields, PORTAL_FOOTER_TEXT),
    html: buildBrandedEmailHtml(meta, fields, PORTAL_FOOTER_HTML),
  });
}

// ---------------------------------------------------------------------------
// Caller ID change emails (PORTAL_PLAN.md Section 8, R23/R24)
// ---------------------------------------------------------------------------

export type CallerIdDiffEntry = {
  phone: string;
  label: string;
  passcode?: string | null;
  sort_order?: number;
  from_order?: number;
  to_order?: number;
};

const DIFF_GREEN = "#22c55e";
const DIFF_GREEN_BG = "#16351f";
const DIFF_RED = "#ef4444";
const DIFF_RED_BG = "#3a1616";
const DIFF_MOVED = "#38bdf8";
const DIFF_MOVED_BG = "#0c2a3d";
const DIFF_UNCHANGED = "#d4d4d4";
const DIFF_UNCHANGED_BG = "#181818";
const DIFF_UNCHANGED_BORDER = "#3f3f3f";

type CallerIdRowKind = "added" | "removed" | "moved" | "unchanged";

function callerIdEntryKey(entry: CallerIdDiffEntry): string {
  return `${entry.phone}|${entry.label}|${entry.passcode ?? ""}`;
}

function callerIdRowTone(kind: CallerIdRowKind): { color: string; bg: string; border: string } {
  if (kind === "added") return { color: DIFF_GREEN, bg: DIFF_GREEN_BG, border: DIFF_GREEN };
  if (kind === "removed") return { color: DIFF_RED, bg: DIFF_RED_BG, border: DIFF_RED };
  if (kind === "moved") return { color: DIFF_MOVED, bg: DIFF_MOVED_BG, border: DIFF_MOVED };
  return { color: DIFF_UNCHANGED, bg: DIFF_UNCHANGED_BG, border: DIFF_UNCHANGED_BORDER };
}

// Display order per stakeholder: call-order number, name, phone, then the
// monitoring-station passcode (needed verbatim for the Lanvac entry).
function listRowHtml(entry: CallerIdDiffEntry, kind: CallerIdRowKind, position?: number): string {
  const { color, bg, border } = callerIdRowTone(kind);
  const sign = kind === "added" ? "+" : kind === "removed" ? "&minus;" : kind === "moved" ? "&#8645;" : "";
  const number = position != null ? `#${position}` : entry.sort_order != null ? `#${entry.sort_order}` : "";
  const movedNote =
    kind === "moved" && entry.from_order != null && entry.to_order != null
      ? ` <span style="color:${DIFF_MOVED};font-weight:600;">(was #${entry.from_order})</span>`
      : "";
  const passcode = entry.passcode
    ? `<span style="color:#a3a3a3;">&nbsp;&middot;&nbsp;passcode:&nbsp;</span><span style="color:#f5f5f5;font-weight:700;">${escapeHtml(entry.passcode)}</span>`
    : "";
  return `<div style="background:${bg};border:1px solid ${border};border-radius:8px;padding:8px 12px;margin:0 0 6px;">
    <span style="color:${color};font-weight:700;">${sign}${sign ? "&nbsp;" : ""}${number ? `${number}&nbsp;` : ""}${escapeHtml(entry.label)}</span>
    <span style="color:#f5f5f5;">&nbsp;&middot;&nbsp;${escapeHtml(formatPhone(entry.phone))}</span>${passcode}${movedNote}
  </div>`;
}

function fullListHtml(
  contacts: CallerIdDiffEntry[],
  added: CallerIdDiffEntry[],
  removed: CallerIdDiffEntry[],
  reordered: CallerIdDiffEntry[] = [],
): string {
  const addedKeys = new Set(added.map(callerIdEntryKey));
  const movedByKey = new Map(reordered.map((entry) => [callerIdEntryKey(entry), entry]));
  const rows = [
    ...contacts.map((entry, index) => {
      const key = callerIdEntryKey(entry);
      const moved = movedByKey.get(key);
      const kind: CallerIdRowKind = addedKeys.has(key) ? "added" : moved ? "moved" : "unchanged";
      return listRowHtml(moved ? { ...entry, ...moved } : entry, kind, index + 1);
    }),
    ...removed.map((entry) => listRowHtml(entry, "removed", entry.sort_order)),
  ];
  return rows.join("") || "<em>Empty list</em>";
}

function fullListText(
  contacts: CallerIdDiffEntry[],
  added: CallerIdDiffEntry[],
  removed: CallerIdDiffEntry[],
  reordered: CallerIdDiffEntry[] = [],
): string {
  const addedKeys = new Set(added.map(callerIdEntryKey));
  const movedByKey = new Map(reordered.map((entry) => [callerIdEntryKey(entry), entry]));
  const line = (entry: CallerIdDiffEntry, prefix: string, position?: number) => {
    const number = position != null ? `#${position} ` : entry.sort_order != null ? `#${entry.sort_order} ` : "";
    const moved =
      entry.from_order != null && entry.to_order != null ? ` (was #${entry.from_order})` : "";
    return `${prefix}${number}${entry.label}, ${formatPhone(entry.phone)}${entry.passcode ? `, passcode: ${entry.passcode}` : ""}${moved}`;
  };
  return [
    ...contacts.map((entry, index) => {
      const key = callerIdEntryKey(entry);
      const moved = movedByKey.get(key);
      const prefix = addedKeys.has(key) ? "+ " : moved ? "~ " : "  ";
      return line(moved ? { ...entry, ...moved } : entry, prefix, index + 1);
    }),
    ...removed.map((entry) => line(entry, "- ", entry.sort_order)),
  ].join("\n");
}

/**
 * Operational trigger for the Lanvac update (R23): fires on EVERY list change
 * from either side, to the admin inbox, with green/red diff rows and a
 * "changed by" line. Failures are logged and reported to the caller; a failed
 * send never rolls back the save.
 */
export async function sendCallerIdAdminAlert({
  clientName,
  clientEmail,
  changedByDescription,
  contacts,
  added,
  removed,
  reordered = [],
  authorizedVia,
  changeReason,
  profileId,
}: {
  clientName: string;
  clientEmail: string | null;
  changedByDescription: string;
  contacts: CallerIdDiffEntry[];
  added: CallerIdDiffEntry[];
  removed: CallerIdDiffEntry[];
  reordered?: CallerIdDiffEntry[];
  authorizedVia?: string | null;
  changeReason?: string | null;
  profileId: string;
}): Promise<boolean> {
  const onlyOrder = added.length === 0 && removed.length === 0 && reordered.length > 0;
  const meta = {
    title: onlyOrder ? "Caller ID Call Order Changed" : "Caller ID List Changed",
    inboxLabel: "Update Lanvac to match the new list and call order",
  };

  const fields: EmailField[] = [
    { label: "Client", value: `${clientName}${clientEmail ? ` (${clientEmail})` : ""}`, highlight: true },
    { label: "Changed by", value: changedByDescription },
    {
      label: "Full caller ID list (green added, red removed, blue call-order change, gray unchanged)",
      value: fullListText(contacts, added, removed, reordered),
      htmlValue: fullListHtml(contacts, added, removed, reordered),
    },
  ];
  if (authorizedVia) {
    fields.push({ label: "Authorized via", value: AUTHORIZATION_LABELS[authorizedVia] ?? authorizedVia });
  }
  if (changeReason) {
    fields.push({ label: "Reason", value: changeReason });
  }
  fields.push({
    label: "Update the monitoring station",
    value: "Apply this entire list to the Lanvac call list, then archive this email as the record.",
    href: `${siteConfig.url}/admin-dashboard/clients/${profileId}`,
    cta: true,
    buttonLabel: "Open Client Detail",
  });

  return dispatchPortalEmail("Caller ID admin alert", {
    subject: onlyOrder
      ? `📞 Caller ID call order changed: ${clientName}`
      : `📞 Caller ID change: ${clientName}`,
    text: buildBrandedEmailText(meta, fields, PORTAL_FOOTER_TEXT),
    html: buildBrandedEmailHtml(meta, fields, PORTAL_FOOTER_HTML),
  });
}

export const AUTHORIZATION_LABELS: Record<string, string> = {
  client_email: "Client emailed the request",
  client_verbal: "Client requested verbally (phone/site visit)",
  client_in_person: "Client requested in person",
  mckee_initiated: "McKee-initiated correction",
};

/**
 * R24 accountability email: the client is ALWAYS told when an admin changes
 * their list, with the exact diff, the recorded reason, and a dispute path.
 * The caller stamps client_notified_at on the history row when this returns
 * true.
 */
export async function sendCallerIdClientNotification({
  to,
  firstName,
  contacts,
  added,
  removed,
  reordered = [],
  authorizedVia,
  changeReason,
}: {
  to: string;
  firstName: string;
  contacts: CallerIdDiffEntry[];
  added: CallerIdDiffEntry[];
  removed: CallerIdDiffEntry[];
  reordered?: CallerIdDiffEntry[];
  authorizedVia: string;
  changeReason: string;
}): Promise<boolean> {
  const meta = {
    title: "Your Alarm Contact List Was Updated",
    inboxLabel: "Change made by McKee Security on your behalf",
  };

  const fields: EmailField[] = [
    {
      label: "What happened",
      value: `Hi ${firstName},\n\nMcKee Security updated the caller ID contact list for your alarm monitoring, as requested.`,
    },
    {
      label: "Your full caller ID list (green added, red removed, blue call-order change, gray unchanged)",
      value: fullListText(contacts, added, removed, reordered),
      htmlValue: fullListHtml(contacts, added, removed, reordered),
    },
    { label: "Authorization on file", value: AUTHORIZATION_LABELS[authorizedVia] ?? authorizedVia },
    { label: "Reason recorded", value: changeReason },
    {
      label: "Did not request this?",
      value:
        "If you did not ask for this change, contact McKee Security immediately at (705) 457-2156 or info@mckeesecurity.ca.",
      highlight: true,
    },
  ];

  return dispatchPortalEmail("Caller ID client notification", {
    to,
    subject: "Your alarm contact list was updated",
    text: buildBrandedEmailText(meta, fields, PORTAL_FOOTER_TEXT),
    html: buildBrandedEmailHtml(meta, fields, PORTAL_FOOTER_HTML),
  });
}

// ---------------------------------------------------------------------------
// Billing emails (PORTAL_PLAN.md Section 8, R22; Phase 5)
// ---------------------------------------------------------------------------

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)} CAD`;
}

const SERVICE_LABELS: Record<string, string> = {
  monitoring: "Security Monitoring",
  cloud_backup: "Camera Cloud Backup",
  voip: "VoIP Phone Service",
};

/** Manual-rail reminder (R22): sent by the daily cron before due and when overdue. */
export async function sendManualPaymentReminder({
  to,
  firstName,
  serviceType,
  amountCents,
  dueOn,
  overdue,
  paymentInstructions,
}: {
  to: string;
  firstName: string;
  serviceType: string;
  amountCents: number;
  dueOn: string;
  overdue: boolean;
  paymentInstructions: string;
}): Promise<boolean> {
  const service = SERVICE_LABELS[serviceType] ?? serviceType;
  const meta = {
    title: overdue ? "Payment Overdue" : "Payment Reminder",
    inboxLabel: `${service} billing`,
  };

  const fields: EmailField[] = [
    {
      label: overdue ? "Overdue payment" : "Upcoming payment",
      value: `Hi ${firstName},\n\nSend exactly ${dollars(amountCents)} (includes 13% HST). Your ${service} payment ${overdue ? "was due" : "is due"} on ${dueOn}.`,
      highlight: overdue,
    },
    { label: "How to pay", value: paymentInstructions },
    {
      label: "Already paid?",
      value: "If you have already sent this payment, no action is needed. It will be confirmed once processed.",
    },
  ];

  return dispatchPortalEmail("Manual payment reminder", {
    to,
    subject: overdue
      ? `Payment overdue: ${service} (${dollars(amountCents)})`
      : `Payment reminder: ${service} due ${dueOn}`,
    text: buildBrandedEmailText(meta, fields, PORTAL_FOOTER_TEXT),
    html: buildBrandedEmailHtml(meta, fields, PORTAL_FOOTER_HTML),
  });
}

/** Confirmation when an admin records a manual payment (7.3). */
export async function sendManualPaymentRecorded({
  to,
  firstName,
  serviceType,
  amountCents,
  paidOn,
  nextDueOn,
}: {
  to: string;
  firstName: string;
  serviceType: string;
  amountCents: number;
  paidOn: string;
  nextDueOn: string | null;
}): Promise<boolean> {
  const service = SERVICE_LABELS[serviceType] ?? serviceType;
  const meta = {
    title: "Payment Received",
    inboxLabel: `${service} billing`,
  };

  const fields: EmailField[] = [
    {
      label: "Thank you",
      value: `Hi ${firstName},\n\nMcKee Security received your ${service} payment of ${dollars(amountCents)} on ${paidOn}.`,
    },
  ];
  if (nextDueOn) {
    fields.push({ label: "Next payment due", value: nextDueOn });
  }

  return dispatchPortalEmail("Manual payment recorded email", {
    to,
    subject: `Payment received: ${service} (${dollars(amountCents)})`,
    text: buildBrandedEmailText(meta, fields, PORTAL_FOOTER_TEXT),
    html: buildBrandedEmailHtml(meta, fields, PORTAL_FOOTER_HTML),
  });
}

/** Admin alert for a failed card payment (Stripe invoice.payment_failed). */
export async function sendCardPaymentFailedAlert({
  clientName,
  clientEmail,
  serviceType,
  amountCents,
  profileId,
}: {
  clientName: string;
  clientEmail: string | null;
  serviceType: string | null;
  amountCents: number | null;
  profileId: string | null;
}): Promise<boolean> {
  const meta = {
    title: "Card Payment Failed",
    inboxLabel: "Stripe autopay needs follow-up",
  };

  const fields: EmailField[] = [
    { label: "Client", value: `${clientName}${clientEmail ? ` (${clientEmail})` : ""}`, highlight: true },
    { label: "Service", value: serviceType ? (SERVICE_LABELS[serviceType] ?? serviceType) : "Unknown" },
    { label: "Amount", value: amountCents != null ? dollars(amountCents) : "See Stripe dashboard" },
    {
      label: "Follow up",
      value: "Stripe will retry per its schedule. If retries keep failing, contact the client for an updated card.",
      href: profileId
        ? `${siteConfig.url}/admin-dashboard/clients/${profileId}`
        : `${siteConfig.url}/admin-dashboard?tab=billing`,
      cta: true,
      buttonLabel: "Open Billing",
    },
  ];

  return dispatchPortalEmail("Card payment failed alert", {
    subject: `⚠️ Card payment failed: ${clientName}`,
    text: buildBrandedEmailText(meta, fields, PORTAL_FOOTER_TEXT),
    html: buildBrandedEmailHtml(meta, fields, PORTAL_FOOTER_HTML),
  });
}

/** Client confirmation after checkout completes (handover 12, optional). */
export async function sendPaymentSuccessEmail({
  to,
  firstName,
  serviceType,
  tier,
}: {
  to: string;
  firstName: string;
  serviceType: string;
  tier: string;
}): Promise<boolean> {
  const service = SERVICE_LABELS[serviceType] ?? serviceType;
  const meta = {
    title: "Payment Successful",
    inboxLabel: `${service} is active`,
  };

  const fields: EmailField[] = [
    {
      label: "You are all set",
      value: `Hi ${firstName},\n\nYour payment went through and your ${service} service (${tier} plan) is now active. Renewals are automatic; you will only hear from us if a payment ever fails.`,
    },
  ];

  return dispatchPortalEmail("Payment success email", {
    to,
    subject: `Payment successful: ${service} is active`,
    text: buildBrandedEmailText(meta, fields, PORTAL_FOOTER_TEXT),
    html: buildBrandedEmailHtml(meta, fields, PORTAL_FOOTER_HTML),
  });
}

// ---------------------------------------------------------------------------
// Cron emails (PORTAL_PLAN.md 9.4, Phase 7)
// ---------------------------------------------------------------------------

/** R14: one alert per expiry event, to the admin inbox, when the cron finds an expired device. */
export async function sendDeviceExpiryAdminAlert({
  clientName,
  clientEmail,
  deviceLabel,
  installedOn,
  expiredOn,
  profileId,
}: {
  clientName: string;
  clientEmail: string | null;
  deviceLabel: string;
  installedOn: string;
  expiredOn: string;
  profileId: string;
}): Promise<boolean> {
  const meta = {
    title: "Device Past Its Service Life",
    inboxLabel: "Schedule a replacement",
  };

  const fields: EmailField[] = [
    { label: "Client", value: `${clientName}${clientEmail ? ` (${clientEmail})` : ""}`, highlight: true },
    { label: "Device", value: deviceLabel },
    { label: "Installed", value: installedOn },
    { label: "Service life ended", value: expiredOn },
    {
      label: "Next step",
      value: "Contact the client to schedule a replacement, then update the install date on their profile (that clears this alert cycle).",
      href: `${siteConfig.url}/admin-dashboard/clients/${profileId}`,
      cta: true,
      buttonLabel: "Open Client Detail",
    },
  ];

  return dispatchPortalEmail("Device expiry admin alert", {
    subject: `🔋 Device replacement due: ${deviceLabel} (${clientName})`,
    text: buildBrandedEmailText(meta, fields, PORTAL_FOOTER_TEXT),
    html: buildBrandedEmailHtml(meta, fields, PORTAL_FOOTER_HTML),
  });
}

/** R14: matching client notice (handover 6.5/11.9: both parties are told). */
export async function sendDeviceExpiryClientNotice({
  to,
  firstName,
  deviceLabel,
  installedOn,
}: {
  to: string;
  firstName: string;
  deviceLabel: string;
  installedOn: string;
}): Promise<boolean> {
  const meta = {
    title: "Time to Replace a Device",
    inboxLabel: "McKee Security maintenance notice",
  };

  const fields: EmailField[] = [
    {
      label: "Maintenance due",
      value: `Hi ${firstName},\n\nThe ${deviceLabel} on your alarm system (installed ${installedOn}) has reached the end of its recommended service life and should be replaced to keep your protection reliable.`,
    },
    {
      label: "What to do",
      value: "McKee Security will reach out to schedule a replacement. You can also call (705) 457-2156 to book a time that works for you.",
    },
  ];

  return dispatchPortalEmail("Device expiry client notice", {
    to,
    subject: `Maintenance due: your ${deviceLabel} should be replaced`,
    text: buildBrandedEmailText(meta, fields, PORTAL_FOOTER_TEXT),
    html: buildBrandedEmailHtml(meta, fields, PORTAL_FOOTER_HTML),
  });
}

export type CollectionsDigestRow = {
  clientName: string;
  clientEmail: string | null;
  serviceType: string;
  amountCents: number | null;
  dueOn: string;
  overdue: boolean;
};

/**
 * R22: the admin collections digest. Every manual payer due within the
 * reminder window or overdue, in one email, so no legacy payment is missed.
 * Sent by the daily cron only when the list is non-empty.
 */
export async function sendCollectionsDigest(rows: CollectionsDigestRow[]): Promise<boolean> {
  const overdueRows = rows.filter((r) => r.overdue);
  const dueRows = rows.filter((r) => !r.overdue);
  const line = (r: CollectionsDigestRow) =>
    `${r.clientName}${r.clientEmail ? ` (${r.clientEmail})` : ""}: ${SERVICE_LABELS[r.serviceType] ?? r.serviceType}, ${
      r.amountCents != null ? dollars(r.amountCents) : "amount not set"
    }, due ${r.dueOn}`;

  const meta = {
    title: "Collections Digest",
    inboxLabel: `${overdueRows.length} overdue, ${dueRows.length} due soon`,
  };

  const fields: EmailField[] = [];
  if (overdueRows.length > 0) {
    fields.push({
      label: `Overdue (${overdueRows.length})`,
      value: overdueRows.map(line).join("\n"),
      highlight: true,
    });
  }
  if (dueRows.length > 0) {
    fields.push({
      label: `Due soon (${dueRows.length})`,
      value: dueRows.map(line).join("\n"),
    });
  }
  fields.push({
    label: "Record received payments",
    value: "Open the Billing tab to record e-Transfers, cheques, and cash as they arrive.",
    href: `${siteConfig.url}/admin-dashboard?tab=billing`,
    cta: true,
    buttonLabel: "Open Billing",
  });

  return dispatchPortalEmail("Collections digest", {
    subject: `📋 Collections digest: ${overdueRows.length} overdue, ${dueRows.length} due soon`,
    text: buildBrandedEmailText(meta, fields, PORTAL_FOOTER_TEXT),
    html: buildBrandedEmailHtml(meta, fields, PORTAL_FOOTER_HTML),
  });
}

export type AccountChangeField = { field: string; from: string; to: string };

/** McKee inbox notice when a client updates Settings (profile or password). */
export async function sendAccountChangeAdminAlert({
  clientName,
  clientEmail,
  profileId,
  kind,
  changes,
}: {
  clientName: string;
  clientEmail: string | null;
  profileId: string;
  kind: "profile" | "password";
  changes: AccountChangeField[];
}): Promise<boolean> {
  const needsBooksUpdate = kind === "profile";
  const changeLines = changes
    .map((change) => `${change.field}\n  Was: ${change.from}\n  Now: ${change.to}`)
    .join("\n\n");

  const meta = {
    title: kind === "password" ? "Client Password Changed" : "Client Account Updated",
    inboxLabel:
      kind === "password"
        ? "No QuickBooks update needed"
        : "Update QuickBooks if this contact information is used for billing",
  };

  const fields: EmailField[] = [
    { label: "Client", value: `${clientName}${clientEmail ? ` (${clientEmail})` : ""}`, highlight: true },
    { label: "Changed by", value: "The client themselves via the client portal Settings tab" },
    { label: "What changed", value: changeLines },
  ];
  if (needsBooksUpdate) {
    fields.push({
      label: "QuickBooks",
      value:
        "Update the customer record in QuickBooks if this phone number or service address is used for invoices or statements. The sign-in email did not change.",
    });
  } else {
    fields.push({
      label: "QuickBooks",
      value: "This is a portal password change only. No QuickBooks update is needed.",
    });
  }
  fields.push({
    label: "Open the client",
    value: "Review the saved account details on their profile.",
    href: `${siteConfig.url}/admin-dashboard/clients/${profileId}`,
    cta: true,
    buttonLabel: "Open Client Detail",
  });

  return dispatchPortalEmail("Account change admin alert", {
    subject:
      kind === "password"
        ? `🔐 Password changed: ${clientName}`
        : `✏️ Account updated: ${clientName}`,
    text: buildBrandedEmailText(meta, fields, PORTAL_FOOTER_TEXT),
    html: buildBrandedEmailHtml(meta, fields, PORTAL_FOOTER_HTML),
  });
}
