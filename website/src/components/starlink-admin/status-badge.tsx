import { STATUS_META, type RentalStatus, type StatusTone } from "@/lib/starlink/types";
import { cn } from "@/lib/utils";

const TONE_CLASS: Record<StatusTone, string> = {
  amber: "bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-500/30",
  blue: "bg-blue-500/15 text-blue-300 ring-1 ring-inset ring-blue-500/30",
  green: "bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30",
  slate: "bg-slate-500/15 text-slate-300 ring-1 ring-inset ring-slate-500/30",
  red: "bg-red-500/15 text-red-300 ring-1 ring-inset ring-red-500/30",
};

export function StatusBadge({
  status,
  className,
}: {
  status: RentalStatus | string;
  className?: string;
}) {
  const meta = STATUS_META[status as RentalStatus];
  if (!meta) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
          "bg-slate-500/15 text-slate-300 ring-1 ring-inset ring-slate-500/30",
          className,
        )}
      >
        {status}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        TONE_CLASS[meta.tone],
        className,
      )}
    >
      {meta.label}
    </span>
  );
}
