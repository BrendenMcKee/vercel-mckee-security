import Image from "next/image";
import { team } from "@/lib/site-config";
import {
  StaggerContainer,
  StaggerItem,
} from "@/components/motion/fade-in";
import { SectionHeading } from "@/components/ui/section-heading";
import { FadeIn } from "@/components/motion/fade-in";

export function TeamGrid() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-6">
        <FadeIn>
          <SectionHeading
            eyebrow="Meet The Team"
            title="Team McKee"
            description="A family-owned company with deep roots in the Haliburton community."
          />
        </FadeIn>
        <StaggerContainer className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {team.map((member) => (
            <StaggerItem key={member.name}>
              <div className="group overflow-hidden rounded-2xl border border-white/10 bg-surface-elevated/40 transition hover:border-primary/30 hover:bg-surface-elevated">
                <div className="relative aspect-square overflow-hidden bg-[#111111]">
                  <Image
                    src={member.photo}
                    alt={member.name}
                    fill
                    className="object-cover object-top transition duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-white">{member.name}</h3>
                  <p className="mt-1 text-sm text-white/55">{member.role}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
