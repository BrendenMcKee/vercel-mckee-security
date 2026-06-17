import type { Metadata } from "next";
import { Hero } from "@/components/sections/hero";
import { ServiceCardGrid } from "@/components/sections/service-card-grid";
import { FadeIn } from "@/components/motion/fade-in";
import { SectionHeading } from "@/components/ui/section-heading";
import { CtaBand, HeritageBand } from "@/components/sections/cta-band";

export const metadata: Metadata = {
  title: "Custom Installations and Professional Products",
  description:
    "Comprehensive technology solutions for residential and commercial properties in Haliburton. Security, cameras, networking, audio/video, and Starlink.",
};

const approach = [
  {
    title: "Custom Design",
    text: "No two properties are the same. We assess your unique needs, design a tailored solution, and ensure every component is selected and positioned for maximum performance and value.",
  },
  {
    title: "Professional Installation",
    text: "Our experienced technicians handle every aspect of installation with precision and care. Clean cable runs, secure mounting, and thorough configuration ensure systems that perform flawlessly from day one.",
  },
  {
    title: "Ongoing Support",
    text: "We stand behind every installation with responsive local support. Whether you need to expand your system, troubleshoot an issue, or upgrade your equipment, we are just a phone call away.",
  },
];

const whyUs = [
  {
    title: "Leading Industry Professionals",
    text: "Over 30 years of hands-on experience across security, surveillance, networking, audio-visual, and satellite internet.",
  },
  {
    title: "Complete Equipment Ownership",
    text: "You own all equipment and data from day one. No rental fees, no subscription traps, and no long-term contracts required.",
  },
  {
    title: "Local and Responsive",
    text: "Based in the Haliburton region, we provide fast, responsive support when you need it. No call centres. Real people, real solutions.",
  },
  {
    title: "Integrated Solutions",
    text: "Combine security, cameras, and networking into a unified system managed from a single interface, all installed by the same trusted team.",
  },
];

export default function ServicesHubPage() {
  return (
    <>
      <Hero
        eyebrow="Custom Installations"
        title="Professional Solutions Tailored to Your Property"
        subtitle="McKee Security and Audio Systems provides comprehensive technology solutions for residential and commercial properties throughout the Haliburton region."
        compact
        primaryCta={{ label: "Get a Free Quote", href: "#quote" }}
      />

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <FadeIn>
            <SectionHeading title="Our Custom Installation Services" />
          </FadeIn>
          <div className="mt-12">
            <ServiceCardGrid />
          </div>
        </div>
      </section>

      <section className="bg-surface py-20">
        <div className="mx-auto max-w-7xl px-6">
          <FadeIn>
            <SectionHeading
              eyebrow="The McKee Approach"
              title="Built on three core principles"
            />
          </FadeIn>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {approach.map((item, i) => (
              <FadeIn key={item.title} delay={i * 0.08}>
                <div className="rounded-2xl border border-white/10 p-8">
                  <h3 className="text-xl font-bold text-white">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/60">{item.text}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <FadeIn>
            <SectionHeading title="Why Choose McKee Security and Audio Systems" />
          </FadeIn>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {whyUs.map((item, i) => (
              <FadeIn key={item.title} delay={i * 0.06}>
                <div className="rounded-2xl border border-white/10 bg-surface-elevated/30 p-6">
                  <h3 className="font-bold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm text-white/60">{item.text}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <div id="quote">
        <CtaBand title="Ready to Get Started?" subtitle="Tell us about your project and we will design a custom solution for your property." />
      </div>
      <HeritageBand />
    </>
  );
}
