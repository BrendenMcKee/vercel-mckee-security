import Link from "next/link";

/** Visible on every admin tab while customer mail is held for import. */
export function ClientMailPausedBanner() {
  return (
    <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5">
      <p className="text-sm font-bold uppercase tracking-widest text-amber-300">
        Client email paused
      </p>
      <p className="mt-2 text-sm leading-relaxed text-amber-100/90">
        Imported customers will not receive invitations, payment reminders, payment
        receipts, caller-ID notices, or device-replacement mail. Staff alerts still
        send. Turn this on from the{" "}
        <Link href="/admin-dashboard?tab=billing" className="font-bold text-white underline underline-offset-2 hover:text-amber-200">
          Billing tab
        </Link>{" "}
        only after the import is checked, the portal is working, and the QuickBooks
        bridge is on the live company file.
      </p>
    </div>
  );
}
