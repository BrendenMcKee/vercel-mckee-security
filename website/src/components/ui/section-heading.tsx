import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-3xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow && (
        <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-primary">
          {eyebrow}
        </p>
      )}
      <h2 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-lg leading-relaxed text-white/65">
          {description}
        </p>
      )}
    </div>
  );
}
