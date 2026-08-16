import type { LanvacEmergencyNumbers } from "@/lib/portal/lanvac-cities";

function NumberRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-black/25 px-3 py-2.5">
      <dt className="text-[11px] font-bold uppercase tracking-widest text-white/40">{label}</dt>
      <dd className="mt-1 text-sm font-semibold tabular-nums text-white">{value || "Not listed"}</dd>
    </div>
  );
}

export function LanvacEmergencyReadout({
  city,
  numbers,
}: {
  city: string | null | undefined;
  numbers: LanvacEmergencyNumbers | null;
}) {
  if (!city?.trim()) return null;
  if (!numbers) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-white/2.5 p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-white/40">
        Emergency services assigned for
      </p>
      <p className="mt-1 text-base font-bold text-white">{city}</p>
      <dl className="mt-4 grid gap-2 sm:grid-cols-3">
        <NumberRow label="Police" value={numbers.police} />
        <NumberRow label="Fire" value={numbers.fire} />
        <NumberRow label="Ambulance" value={numbers.ambulance} />
      </dl>
      <p className="mt-3 text-xs text-white/40">
        Set by the monitoring station for this dispatch city. Not part of the
        people list, and not editable here.
      </p>
    </div>
  );
}
