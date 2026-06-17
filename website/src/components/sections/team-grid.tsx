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
        <StaggerContainer className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {team.map((member) => (
            <StaggerItem key={member.name}>
              <div className="group rounded-2xl border border-white/10 bg-surface-elevated/40 p-6 transition hover:border-primary/30 hover:bg-surface-elevated">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/20 text-lg font-bold text-primary transition group-hover:bg-primary group-hover:text-white">
                  {member.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <h3 className="font-bold text-white">{member.name}</h3>
                <p className="mt-1 text-sm text-white/55">{member.role}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
