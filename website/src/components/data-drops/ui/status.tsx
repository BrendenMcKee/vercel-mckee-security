import { cn } from "@/lib/utils";
import type { SignatureStatus } from "@/lib/data-drops/types";

const dotStyles: Record<SignatureStatus, string> = {
  0: "bg-red-500",
  1: "bg-amber-400",
  2: "bg-emerald-500",
};

const pillStyles: Record<SignatureStatus, string> = {
  0: "border-red-500/30 bg-red-500/15 text-red-300",
  1: "border-amber-400/30 bg-amber-400/15 text-amber-300",
  2: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
};

const pillLabels: Record<SignatureStatus, string> = {
  0: "Unsigned",
  1: "Partial",
  2: "Signed",
};

export function StatusDot({
  status,
  className,
}: {
  status: SignatureStatus;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-block h-2.5 w-2.5 rounded-full", dotStyles[status], className)}
      aria-hidden="true"
    />
  );
}

export function StatusPill({ status }: { status: SignatureStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        pillStyles[status],
      )}
    >
      <StatusDot status={status} />
      {pillLabels[status]}
    </span>
  );
}
