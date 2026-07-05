import "server-only";
import { sendEmail } from "@/lib/email";
import {
  buildBrandedEmailHtml,
  buildBrandedEmailText,
  escapeHtml,
  type EmailField,
} from "@/lib/email-templates";
import { siteConfig } from "@/lib/site-config";
import { formatPhone } from "@/lib/portal/phone";

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
    emoji: "🔐",
    title: "Your Client Portal Invitation",
    inboxLabel: "McKee Security account activation",
  };

  const fields: EmailField[] = [
    {
      label: "Welcome",
      value: `Hi ${firstName},\n\nMcKee Security has created a client portal account for you. Use it to view your services, manage your alarm contact list, and keep your account details current.`,
    },
    {
      label: "Activate your account",
      value:
        "Click the button below to choose how you sign in: continue with Google or set a password.",
      href: activateUrl,
      cta: true,
      buttonLabel: "Activate My Account",
    },
    {
      label: "Link expires",
      value: `${formatExpiry(expiresAt)} ET. If it expires, contact McKee Security and we will send a fresh one.`,
    },
  ];

  try {
    return await sendEmail({
      to,
      subject: "Activate your McKee Security client portal account",
      text: buildBrandedEmailText(meta, fields, PORTAL_FOOTER_TEXT),
      html: buildBrandedEmailHtml(meta, fields, PORTAL_FOOTER_HTML),
    });
  } catch (error) {
    console.error("[portal] Invitation email failed:", error);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Caller ID change emails (PORTAL_PLAN.md Section 8, R23/R24)
// ---------------------------------------------------------------------------

export type CallerIdDiffEntry = { phone: string; label: string };

const DIFF_GREEN = "#22c55e";
const DIFF_GREEN_BG = "rgba(34, 197, 94, 0.12)";
const DIFF_RED = "#ef4444";
const DIFF_RED_BG = "rgba(239, 68, 68, 0.12)";

function diffRowHtml(entry: CallerIdDiffEntry, kind: "added" | "removed"): string {
  const color = kind === "added" ? DIFF_GREEN : DIFF_RED;
  const bg = kind === "added" ? DIFF_GREEN_BG : DIFF_RED_BG;
  const sign = kind === "added" ? "+" : "&minus;";
  return `<div style="background:${bg};border:1px solid ${color};border-radius:8px;padding:8px 12px;margin:0 0 6px;">
    <span style="color:${color};font-weight:700;">${sign}&nbsp;${escapeHtml(formatPhone(entry.phone))}</span>
    <span style="color:#f5f5f5;">&nbsp;&mdash;&nbsp;${escapeHtml(entry.label)}</span>
  </div>`;
}

function diffHtml(added: CallerIdDiffEntry[], removed: CallerIdDiffEntry[]): string {
  const rows = [
    ...added.map((e) => diffRowHtml(e, "added")),
    ...removed.map((e) => diffRowHtml(e, "removed")),
  ];
  return rows.join("") || "<em>No changes</em>";
}

function diffText(added: CallerIdDiffEntry[], removed: CallerIdDiffEntry[]): string {
  return [
    ...added.map((e) => `+ ${formatPhone(e.phone)} (${e.label})`),
    ...removed.map((e) => `- ${formatPhone(e.phone)} (${e.label})`),
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
  added,
  removed,
  authorizedVia,
  changeReason,
  profileId,
}: {
  clientName: string;
  clientEmail: string | null;
  changedByDescription: string;
  added: CallerIdDiffEntry[];
  removed: CallerIdDiffEntry[];
  authorizedVia?: string | null;
  changeReason?: string | null;
  profileId: string;
}): Promise<boolean> {
  const meta = {
    emoji: "📞",
    title: "Caller ID List Changed",
    inboxLabel: "Update Lanvac to match the new list",
  };

  const fields: EmailField[] = [
    { label: "Client", value: `${clientName}${clientEmail ? ` (${clientEmail})` : ""}`, highlight: true },
    { label: "Changed by", value: changedByDescription },
    {
      label: "Changes (green added, red removed)",
      value: diffText(added, removed),
      htmlValue: diffHtml(added, removed),
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
    value: "Apply this exact diff to the Lanvac call list, then archive this email as the record.",
    href: `${siteConfig.url}/admin-dashboard/clients/${profileId}`,
    cta: true,
    buttonLabel: "Open Client Detail",
  });

  try {
    return await sendEmail({
      subject: `Caller ID change: ${clientName}`,
      text: buildBrandedEmailText(meta, fields, PORTAL_FOOTER_TEXT),
      html: buildBrandedEmailHtml(meta, fields, PORTAL_FOOTER_HTML),
    });
  } catch (error) {
    console.error("[portal] Caller ID admin alert failed:", error);
    return false;
  }
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
  added,
  removed,
  authorizedVia,
  changeReason,
}: {
  to: string;
  firstName: string;
  added: CallerIdDiffEntry[];
  removed: CallerIdDiffEntry[];
  authorizedVia: string;
  changeReason: string;
}): Promise<boolean> {
  const meta = {
    emoji: "📞",
    title: "Your Alarm Contact List Was Updated",
    inboxLabel: "Change made by McKee Security on your behalf",
  };

  const fields: EmailField[] = [
    {
      label: "What happened",
      value: `Hi ${firstName},\n\nMcKee Security updated the caller ID contact list for your alarm monitoring, as requested.`,
    },
    {
      label: "Changes (green added, red removed)",
      value: diffText(added, removed),
      htmlValue: diffHtml(added, removed),
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

  try {
    return await sendEmail({
      to,
      subject: "Your McKee Security alarm contact list was updated",
      text: buildBrandedEmailText(meta, fields, PORTAL_FOOTER_TEXT),
      html: buildBrandedEmailHtml(meta, fields, PORTAL_FOOTER_HTML),
    });
  } catch (error) {
    console.error("[portal] Caller ID client notification failed:", error);
    return false;
  }
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
    emoji: "💳",
    title: overdue ? "Payment Overdue" : "Payment Reminder",
    inboxLabel: `${service} billing`,
  };

  const fields: EmailField[] = [
    {
      label: overdue ? "Overdue payment" : "Upcoming payment",
      value: `Hi ${firstName},\n\nYour ${service} payment of ${dollars(amountCents)} ${overdue ? "was due" : "is due"} on ${dueOn}.`,
      highlight: overdue,
    },
    { label: "How to pay", value: paymentInstructions },
    {
      label: "Already paid?",
      value: "If you have already sent this payment, no action is needed. It will be confirmed once processed.",
    },
  ];

  try {
    return await sendEmail({
      to,
      subject: overdue
        ? `Payment overdue: ${service} (${dollars(amountCents)})`
        : `Payment reminder: ${service} due ${dueOn}`,
      text: buildBrandedEmailText(meta, fields, PORTAL_FOOTER_TEXT),
      html: buildBrandedEmailHtml(meta, fields, PORTAL_FOOTER_HTML),
    });
  } catch (error) {
    console.error("[portal] Manual payment reminder failed:", error);
    return false;
  }
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
    emoji: "✅",
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

  try {
    return await sendEmail({
      to,
      subject: `Payment received: ${service} (${dollars(amountCents)})`,
      text: buildBrandedEmailText(meta, fields, PORTAL_FOOTER_TEXT),
      html: buildBrandedEmailHtml(meta, fields, PORTAL_FOOTER_HTML),
    });
  } catch (error) {
    console.error("[portal] Manual payment recorded email failed:", error);
    return false;
  }
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
    emoji: "⚠️",
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

  try {
    return await sendEmail({
      subject: `Card payment failed: ${clientName}`,
      text: buildBrandedEmailText(meta, fields, PORTAL_FOOTER_TEXT),
      html: buildBrandedEmailHtml(meta, fields, PORTAL_FOOTER_HTML),
    });
  } catch (error) {
    console.error("[portal] Card payment failed alert failed:", error);
    return false;
  }
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
    emoji: "✅",
    title: "Payment Successful",
    inboxLabel: `${service} is active`,
  };

  const fields: EmailField[] = [
    {
      label: "You are all set",
      value: `Hi ${firstName},\n\nYour payment went through and your ${service} service (${tier} plan) is now active. Renewals are automatic; you will only hear from us if a payment ever fails.`,
    },
  ];

  try {
    return await sendEmail({
      to,
      subject: `Payment successful: ${service} is active`,
      text: buildBrandedEmailText(meta, fields, PORTAL_FOOTER_TEXT),
      html: buildBrandedEmailHtml(meta, fields, PORTAL_FOOTER_HTML),
    });
  } catch (error) {
    console.error("[portal] Payment success email failed:", error);
    return false;
  }
}
