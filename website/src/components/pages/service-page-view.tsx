import { notFound } from "next/navigation";
import { getServiceBySlug } from "@/lib/services";
import { getServicePageContent } from "@/lib/service-pages";
import { Hero } from "@/components/sections/hero";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion/fade-in";
import { SectionHeading } from "@/components/ui/section-heading";
import { CtaBand, HeritageBand } from "@/components/sections/cta-band";
import { MonitoringTiers } from "@/components/sections/monitoring-tiers";

export function ServicePageView({ slug }: { slug: string }) {
  const service = getServiceBySlug(slug);
  const content = getServicePageContent(slug);
  if (!service || !content) notFound();

  const Icon = service.icon;

  return (
    <>
      <Hero
        eyebrow={content.eyebrow}
        title={content.headline}
        subtitle={content.heroSubtitle}
        compact
        primaryCta={{ label: "Get a Free Quote", href: "#quote" }}
        secondaryCta={{ label: "Call Us", href: "tel:+17054572156" }}
      />

      <section className="py-12">
        <StaggerContainer className="mx-auto grid max-w-5xl grid-cols-2 gap-4 px-6 sm:grid-cols-3 lg:grid-cols-6">
          {content.featureIcons.map((icon) => (
            <StaggerItem key={icon.label}>
              <div className="rounded-xl border border-white/10 bg-surface-elevated/40 p-4 text-center transition hover:border-primary/40">
                <Icon className="mx-auto mb-2 h-6 w-6 text-primary" />
                <p className="text-xs font-bold uppercase leading-tight text-white/80">
                  {icon.label}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <FadeIn>
            <p className="text-lg leading-relaxed text-white/70">{content.intro}</p>
          </FadeIn>
        </div>
      </section>

      <section className="bg-surface py-20">
        <div className="mx-auto max-w-7xl px-6">
          <FadeIn>
            <SectionHeading title="Complete Protection for Your Property" />
          </FadeIn>
          <div className="mt-12 grid gap-8 lg:grid-cols-3">
            {content.blocks.map((block, i) => (
              <FadeIn key={block.title} delay={i * 0.1}>
                <div className="h-full rounded-2xl border border-white/10 bg-surface-elevated/50 p-8">
                  <h3 className="text-xl font-bold text-white">{block.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/60">
                    {block.description}
                  </p>
                  <ul className="mt-4 space-y-2">
                    {block.bullets.map((b) => (
                      <li key={b} className="flex items-center gap-2 text-sm text-white/75">
                        <span className="h-1 w-1 rounded-full bg-primary" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {content.valueProps && (
        <section className="py-20">
          <div className="mx-auto max-w-7xl px-6">
            <FadeIn>
              <SectionHeading title="Why Choose McKee Security" />
            </FadeIn>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {content.valueProps.map((vp, i) => (
                <FadeIn key={vp.title} delay={i * 0.08}>
                  <div className="rounded-2xl border border-white/10 p-6">
                    <h3 className="font-bold text-white">{vp.title}</h3>
                    <p className="mt-2 text-sm text-white/60">{vp.description}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      )}

      {slug === "security" && <MonitoringTiers />}

      <div id="quote">
        <CtaBand
          title={
            slug === "starlink"
              ? "Ready for High-Speed Satellite Internet?"
              : slug === "camera-surveillance"
                ? "Ready to enhance your security with professional cameras?"
                : undefined
          }
          serviceLabel={
            slug === "audio-video"
              ? "What audio/video services are you interested in? (TV mounting, soundbar, whole-home audio, home theater, etc.)"
              : slug === "starlink"
                ? "Have you already purchased your Starlink kit? If so, which generation?"
                : undefined
          }
        />
      </div>
      <HeritageBand />
    </>
  );
}
