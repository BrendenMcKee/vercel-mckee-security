import { cn } from "@/lib/utils";

type FormIconProps = {
  emoji?: string;
  emojis?: string[];
  className?: string;
};

export function FormIcon({ emoji, emojis, className }: FormIconProps) {
  const icons = emojis ?? (emoji ? [emoji] : []);
  const isDuo = icons.length > 1;

  return (
    <div
      className={cn("mckee-form-icon", isDuo && "mckee-form-icon--duo", className)}
      aria-hidden="true"
    >
      {icons.map((icon, index) => (
        <span key={`${icon}-${index}`} className="mckee-form-icon-glyph">
          {icon}
        </span>
      ))}
    </div>
  );
}
