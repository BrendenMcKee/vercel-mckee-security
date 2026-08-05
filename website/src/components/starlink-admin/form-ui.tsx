import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The shared form vocabulary for the Starlink admin. It lives in one place so a
 * heading in the booking modal and a heading in the fleet tab cannot drift
 * apart, and so the touch-size and contrast rules below only have to be got
 * right once.
 */

/**
 * 16px on touch and 14px from `sm` up. iOS Safari zooms the page whenever a
 * focused field is under 16px, and these screens are mostly fields, so the
 * smaller desktop size is opted into rather than inherited.
 */
export const inputClass =
  "w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2.5 text-base text-white outline-none placeholder:text-white/30 focus:border-primary sm:py-2 sm:text-sm";

/**
 * Quieter than a section heading but still readable on a phone in daylight
 * (about 5.6:1 on the surface colour). A field label captions one box; it is not
 * a division of the form.
 */
export const labelClass =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/55";

export function Field({
  label,
  children,
  className,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

/**
 * A titled division of a form or panel. Sized, weighted and ruled off so it
 * clearly outranks the field labels underneath it, which previously looked
 * near-identical to it.
 */
export function Section({
  icon: Icon,
  title,
  className,
  children,
}: {
  icon: LucideIcon;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <h3 className="text-sm font-bold text-white">{title}</h3>
      </div>
      {children}
    </section>
  );
}
