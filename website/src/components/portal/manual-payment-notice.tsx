import {
  ETRANSFER_EMAIL,
  PAYMENT_PHONE,
  PAYMENT_PHONE_TEL,
  formatCents,
  invoicePreTaxCents,
  invoiceSendCents,
  type BillingInterval,
} from "@/lib/portal/billing";
import { CopyableEmail } from "@/components/portal/copyable-email";

function formatDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * How to pay on the manual rail. Email and phone are the action, so they
 * sit apart from the surrounding copy instead of being buried in a sentence.
 */
export function ManualPaymentInstructions() {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-amber-200/90">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-amber-100/80">
          Interac e-Transfer
        </p>
        <p className="mt-1.5">
          Send the exact amount to <CopyableEmail email={ETRANSFER_EMAIL} />. Put
          your name in the message.
        </p>
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-amber-100/80">
          Cheque or cash
        </p>
        <p className="mt-1.5">
          Call{" "}
          <a
            href={`tel:${PAYMENT_PHONE_TEL}`}
            className="font-semibold text-amber-50 underline decoration-amber-300/50 underline-offset-2 hover:text-white"
          >
            {PAYMENT_PHONE}
          </a>{" "}
          to arrange payment.
        </p>
      </div>
    </div>
  );
}

/**
 * Dashboard / Alerts banner when a manual-rail invoice is unpaid. Amount,
 * due date, and how to pay are separate rows so the send figure is obvious.
 */
export function ManualPaymentBanner({
  serviceLabel,
  monthlyCents,
  interval,
  dueOn,
}: {
  serviceLabel: string;
  monthlyCents: number | null;
  interval: BillingInterval;
  dueOn: string | null;
}) {
  const sendCents = monthlyCents != null ? invoiceSendCents(monthlyCents, interval) : null;
  const preTaxCents = monthlyCents != null ? invoicePreTaxCents(monthlyCents, interval) : null;

  return (
    <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 sm:p-6">
      <h2 className="text-lg font-bold text-amber-100">Payment needed: {serviceLabel}</h2>
      {sendCents != null && preTaxCents != null && monthlyCents != null ? (
        <div className="mt-4 space-y-3 text-sm">
          <div>
            <p className="text-amber-200/70">Amount to send</p>
            <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-amber-50">
              {formatCents(sendCents)}
            </p>
            <p className="mt-0.5 text-xs text-amber-200/65">includes 13% HST</p>
          </div>
          <div className="space-y-1.5 text-amber-100/90">
            {dueOn ? (
              <p>
                Due: <span className="font-semibold text-amber-50">{formatDate(dueOn)}</span>
              </p>
            ) : null}
            <p>
              Before tax:{" "}
              <span className="tabular-nums">
                {formatCents(preTaxCents)}
                {interval === "annual" ? " per year" : " per month"}
              </span>
            </p>
            <p>
              Rate: {formatCents(monthlyCents)}/month
              {interval === "annual" ? ", billed annually" : ""}
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-amber-200/90">
          A payment is due on this service.
        </p>
      )}
      <div className="mt-5 border-t border-amber-400/20 pt-4">
        <ManualPaymentInstructions />
      </div>
    </div>
  );
}

/**
 * Plan rate on a service card. The after-HST send amount is a second line
 * and only appears for e-Transfer / cheque / cash.
 */
export function ServiceRateLine({
  monthlyCents,
  interval,
  billingMethod,
  suffix,
}: {
  monthlyCents: number;
  interval: BillingInterval;
  billingMethod: "stripe" | "manual";
  suffix?: string;
}) {
  const cycle = interval === "annual" ? ", invoiced annually" : "";

  if (billingMethod !== "manual") {
    return (
      <p className="mt-2 text-[15px] text-white/55">
        <span className="font-semibold text-white/80">{formatCents(monthlyCents)}</span>
        /month plus HST
        {suffix}
        {cycle}
      </p>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <p className="text-[15px] text-white/55">
        <span className="font-semibold text-white/80">{formatCents(monthlyCents)}</span>
        /month before tax
        {suffix}
        {cycle}
      </p>
      <p className="text-[15px] text-white/70">
        Amount to send{" "}
        <span className="font-semibold text-white">
          {formatCents(invoiceSendCents(monthlyCents, interval))}
        </span>
        <span className="mt-0.5 block text-sm text-white/45">includes 13% HST</span>
      </p>
    </div>
  );
}
