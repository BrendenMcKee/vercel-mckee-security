import type { LanvacEmergencyNumbers } from "@/lib/portal/lanvac-cities";

function NumberRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-widest text-white/40">{label}</dt>
      <dd className="mt-1 font-semibold tabular-nums text-white/85">{value || "Not listed"}</dd>
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
  if (!city?.trim()) {
    return (
      <p className="text-sm text-white/45">
        No dispatch city on file yet. Police, fire, and ambulance come from that
        city, not the people list.
      </p>
    );
  }
  if (!numbers) {
    return (
      <p className="text-sm text-white/45">
        {city} is on file, but it is not a Lanvac directory city. An admin needs
        to pick the official spelling so emergency numbers can load.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-widest text-white/40">
        Emergency numbers · {city}
      </p>
      <dl className="grid gap-3 sm:grid-cols-3">
        <NumberRow label="Police" value={numbers.police} />
        <NumberRow label="Fire" value={numbers.fire} />
        <NumberRow label="Ambulance" value={numbers.ambulance} />
      </dl>
    </div>
  );
}
