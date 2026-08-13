import { SERVICE_TYPE_LABELS, tierLabel } from "@/lib/portal/service-labels";
import { formatCents, voipPortFeeCents } from "@/lib/portal/billing";
import { PayNowButton } from "@/components/portal/pay-now-button";
import { PayPortFeeButton } from "@/components/portal/pay-port-fee-button";
import { ConfirmRemainingButton } from "@/components/portal/confirm-remaining-button";

export type PayableService = {
  id: string;
  service_type: "monitoring" | "cloud_backup" | "voip";
  tier: string;
  status: string;
  next_due_on: string | null;
};

export function PaymentSetupBanner({
  services,
  portFee,
  hasCardOnFile,
}: {
  services: PayableService[];
  portFee: { serviceId: string; uncharged: number } | null;
  hasCardOnFile: boolean;
}) {
  if (services.length === 0 && !portFee) return null;

  const items = [
    ...services.map((service) => {
      const dueNow = service.status === "unpaid";
      return dueNow
        ? `${SERVICE_TYPE_LABELS[service.service_type]} (${tierLabel(service.tier)})`
        : `${SERVICE_TYPE_LABELS[service.service_type]} (${tierLabel(service.tier)}), first automatic charge on the regular billing date`;
    }),
    ...(portFee
      ? [
          `Number port fee, ${formatCents(voipPortFeeCents(portFee.uncharged))} plus tax for ${portFee.uncharged} number${portFee.uncharged === 1 ? "" : "s"} (one time)`,
        ]
      : []),
  ];

  // Card already saved. Later extra ports are a one-tap charge. Leftover
  // services after the first setup (rare) start on that same card, no second
  // Checkout. A port-only leftover uses the dedicated pay button.
  if (hasCardOnFile && services.length === 0 && portFee) {
    return (
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 sm:p-6">
        <h2 className="text-lg font-bold text-amber-100">Number port fee due</h2>
        <p className="mt-3 text-sm leading-relaxed text-amber-200/90">
          One-time fee of {formatCents(voipPortFeeCents(portFee.uncharged))} plus tax for{" "}
          {portFee.uncharged} number{portFee.uncharged === 1 ? "" : "s"}. This is not part of the
          monthly VoIP plan. Your card on file will be charged.
        </p>
        <div className="mt-4">
          <PayPortFeeButton serviceId={portFee.serviceId} />
        </div>
      </div>
    );
  }

  if (hasCardOnFile) {
    return (
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 sm:p-6">
        <h2 className="text-lg font-bold text-amber-100">Finish starting your services</h2>
        <p className="mt-3 text-sm leading-relaxed text-amber-200/90">
          Your card is already on file. Confirm to start the remaining items on that card. You will
          not enter card details again.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-100/90">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <div className="mt-4">
          <ConfirmRemainingButton />
        </div>
      </div>
    );
  }

  const first = services[0];
  return (
    <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 sm:p-6">
      <h2 className="text-lg font-bold text-amber-100">Set up your card to start your services</h2>
      <p className="mt-3 text-sm leading-relaxed text-amber-200/90">
        Your services are already approved. Add your card once and we start all of them
        {portFee ? ", including the one-time number port fee" : ""}. After that, payments are
        automatic. Change your card any time from Billing &amp; Payments.
      </p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-100/90">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      {first ? (
        <div className="mt-4">
          <PayNowButton serviceId={first.id} label="Add Card And Start Services" />
        </div>
      ) : (
        <p className="mt-4 text-sm text-amber-200/90">
          Add a card on one of your services first
          {portFee ? ". The port fee is charged on that same card" : ""}.
        </p>
      )}
    </div>
  );
}
