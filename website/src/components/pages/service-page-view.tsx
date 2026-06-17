import Image from "next/image";
import { notFound } from "next/navigation";
import { getServiceBySlug } from "@/lib/services";
import { getServicePageContent } from "@/lib/service-pages";
import { Hero } from "@/components/sections/hero";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion/fade-in";
import { SectionHeading } from "@/components/ui/section-heading";
import { CtaBand, HeritageBand } from "@/components/sections/cta-band";
import { MonitoringTiers } from "@/components/sections/monitoring-tiers";
import { images } from "@/lib/site-config";

const extraImages: Record<string, string[]> = {
  security: [
    images.services.securityWired,
    images.services.securityFacilities,
    images.services.totalConnect,
    images.services.honeywell,
  ],
  starlink: [images.services.starlinkMount, images.services.starlinkCable],
  "audio-video": [images.services.homeTheater, images.services.tvInstall],
};

export function ServicePageView({ slug }: { slug: string }) {
  const service = getServiceBySlug(slug);
  const content = getServicePageContent(slug);
  if (!service || !content) notFound();

  const gallery = extraImages[slug] ?? [];

  return (
    <>
      <Hero
        eyebrow={content.eyebrow}
        title={content.headline}
        subtitle={content.heroSubtitle}
        image={service.image}
        compact
        primaryCta={{
          label: "Get a Free Quote",
          href: "#quote",
        }}
        secondaryCta={{
          label: "Call Us",
          href: "tel:+17054572156",
        }}
      />

      <section className="py-12">
        <StaggerContainer className="mx-auto grid max-w-6xl grid-cols-2 gap-3 px-6 sm:grid-cols-3 lg:grid-cols-6">
          {content.featureIcons.map((icon) => (
            <StaggerItem key={icon.label}>
              <div className="rounded-xl border border-white/10 bg-[#111111] p-4 text-center transition hover:border-secondary/50">
                <p className="text-[11px] font-bold uppercase leading-tight text-white/85">
                  {icon.label}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <FadeIn>
            <p className="text-lg leading-relaxed text-white/70">{content.intro}</p>
          </FadeIn>
        </div>
      </section>

      {gallery.length > 0 && (
        <section className="border-y border-white/5 bg-[#111111] py-12">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-6 md:grid-cols-4">
            {gallery.map((src, i) => (
              <FadeIn key={src} delay={i * 0.05}>
                <div className="relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-black">
                  <Image
                    src={src}
                    alt=""
                    fill
                    className="object-contain p-2"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                </div>
              </FadeIn>
            ))}
          </div>
        </section>
      )}

      <section className="bg-surface py-20">
        <div className="mx-auto max-w-7xl px-6">
          <FadeIn>
            <SectionHeading title="Complete Protection for Your Property" />
          </FadeIn>
          <div className="mt-12 grid gap-8 lg:grid-cols-3">
            {content.blocks.map((block, i) => (
              <FadeIn key={block.title} delay={i * 0.1}>
                <div className="h-full overflow-hidden rounded-2xl border border-white/10 bg-[#111111]">
                  <div className="relative aspect-video bg-black/50">
                    <Image
                      src={service.image}
                      alt={block.title}
                      fill
                      className="object-cover opacity-60"
                      sizes="33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#111111] to-transparent" />
                    <h3 className="absolute bottom-4 left-4 right-4 text-xl font-bold text-white">
                      {block.title}
                    </h3>
                  </div>
                  <div className="p-6">
                    <p className="text-sm leading-relaxed text-white/60">
                      {block.description}
                    </p>
                    <ul className="mt-4 space-y-2">
                      {block.bullets.map((b) => (
                        <li
                          key={b}
                          className="flex items-center gap-2 text-sm text-white/75"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
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
                  <div className="rounded-2xl border border-white/10 bg-[#111111] p-6">
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
