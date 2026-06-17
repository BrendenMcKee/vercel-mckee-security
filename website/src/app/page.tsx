import { Hero } from "@/components/sections/hero";
import { StatsBar } from "@/components/sections/stats-bar";
import { ServiceCardGrid } from "@/components/sections/service-card-grid";
import { ServiceCategoryTabs } from "@/components/sections/service-category-tabs";
import { FadeIn } from "@/components/motion/fade-in";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { HeritageBand } from "@/components/sections/cta-band";

export default function HomePage() {
  return (
    <>
      <Hero
        eyebrow="Specialized Security"
        title="Full Home Integration"
        subtitle="We are your one stop technology solution. You can have peace of mind knowing that our systems are custom designed to fit your needs."
        primaryCta={{
          label: "Explore Our Services",
          href: "/custom-installations-professional-products",
        }}
        secondaryCta={{ label: "Contact Us", href: "/contact-us" }}
      />

      <StatsBar />

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <FadeIn>
            <SectionHeading
              eyebrow="Browse"
              title="Custom Installation Services"
              description="We specialize in security, camera surveillance, home audio distribution, home theater, networking, and cellular expansion."
            />
          </FadeIn>
          <div className="mt-12">
            <ServiceCardGrid />
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-surface py-20">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <FadeIn>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">
              Professional
            </p>
            <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
              Custom Installations
            </h2>
            <p className="mt-4 text-lg text-white/65">
              Our professionally trained and fully certified technicians are ready
              to take on any custom home technology installations or renovations
              you may have.
            </p>
            <Button
              href="/custom-installations-professional-products"
              className="mt-8"
              size="lg"
            >
              Learn More
            </Button>
          </FadeIn>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <FadeIn>
            <SectionHeading
              eyebrow="Who we are"
              title="Why choose us?"
              description="At McKee Security and Audio Systems, we deliver comprehensive security solutions, camera surveillance systems, home audio distribution, home theater installations, networking infrastructure, and cellular expansion services."
            />
          </FadeIn>
          <FadeIn delay={0.15}>
            <p className="mx-auto mt-6 max-w-3xl text-center text-white/60">
              McKee Security streamlines your technology experience with custom-designed
              systems tailored precisely to your requirements, providing complete peace
              of mind through our integrated, one-stop technology solutions.
            </p>
            <div className="mt-8 text-center">
              <Button href="/about-us" variant="outline">
                Read More
              </Button>
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="border-y border-white/5 bg-surface py-20">
        <div className="mx-auto max-w-7xl px-6">
          <FadeIn>
            <SectionHeading
              eyebrow="Our Services at a Glance"
              title="What we do"
            />
          </FadeIn>
          <div className="mt-12">
            <ServiceCategoryTabs />
          </div>
        </div>
      </section>

      <HeritageBand />
    </>
  );
}
