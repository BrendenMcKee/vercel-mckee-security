import { deviceColor } from "@/lib/data-drops/devices";

export function DeviceBadge({
  device,
  className,
}: {
  device?: string | null;
  className?: string;
}) {
  if (!device) return null;
  const color = deviceColor(device);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold ${className ?? ""}`}
      style={{
        color,
        borderColor: `${color}55`,
        backgroundColor: `${color}1f`,
      }}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      {device}
    </span>
  );
}
