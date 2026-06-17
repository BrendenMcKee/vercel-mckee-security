import Image from "next/image";
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
      className={cn("grid gap-8 sm:grid-cols-2 xl:grid-cols-3", className)}
    >
      {items.map((service) => {
        const Icon = service.icon;
        return (
          <StaggerItem key={service.slug}>
            <ScaleOnHover>
              <Link
                href={service.href}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111111] transition hover:border-primary/40"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-black">
                  <Image
                    src={service.image}
                    alt={service.title}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-4 left-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/90 text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-lg font-bold text-white">{service.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-white/60">
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
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-primary">
                    Learn More
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            </ScaleOnHover>
          </StaggerItem>
        );
      })}
    </StaggerContainer>
  );
}
