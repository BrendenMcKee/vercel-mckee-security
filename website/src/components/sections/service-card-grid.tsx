import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  StaggerContainer,
  StaggerItem,
  ScaleOnHover,
} from "@/components/motion/fade-in";
import { services, type Service } from "@/lib/services";
import { cn } from "@/lib/utils";

export function ServiceCardGrid({
  items = services,
  className,
}: {
  items?: Service[];
  className?: string;
}) {
  return (
    <StaggerContainer
      className={cn(
        "grid gap-6 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {items.map((service) => {
        const Icon = service.icon;
        return (
          <StaggerItem key={service.slug}>
            <ScaleOnHover>
              <Link
                href={service.href}
                className="group flex h-full flex-col rounded-2xl border border-white/10 bg-surface-elevated/50 p-6 transition hover:border-primary/40 hover:bg-surface-elevated"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary transition group-hover:bg-primary group-hover:text-white">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-white">{service.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-white/60">
                  {service.description}
                </p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {service.features.slice(0, 3).map((f) => (
                    <li
                      key={f}
                      className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/70"
                    >
                      {f}
                    </li>
                  ))}
                </ul>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-primary">
                  Learn More
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </Link>
            </ScaleOnHover>
          </StaggerItem>
        );
      })}
    </StaggerContainer>
  );
}
