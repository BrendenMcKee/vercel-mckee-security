import type { Metadata } from "next";
import { Hero } from "@/components/sections/hero";
import { ApplyForm } from "@/components/forms/apply-form";
import { FadeIn } from "@/components/motion/fade-in";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Apply Now",
  description: "Join Team McKee as a full-time technician in Haliburton County.",
};

export default function ApplyPage() {
  return (
    <>
      <Hero
        eyebrow="Careers"
        title="Apply Today"
        subtitle="Full-time technician positions with onsite training available. Starting wage $18/hr. Senior wage $35/hr and up."
        image="/images/hero-apply-now.jpg"
        objectPosition="8% 50%"
        compact
      />

      <section className="py-16">
        <div className="mx-auto max-w-3xl px-6">
          <FadeIn>
            <div className="mb-10 rounded-2xl border border-white/10 bg-surface-elevated/40 p-8">
              <h2 className="text-xl font-bold text-white">Full-Time Technician</h2>
              <p className="mt-2 text-white/60">
                No previous experience required. Onsite training is available.
              </p>
              <p className="mt-4 text-sm font-bold text-primary">
                MUST reside or be able to commute to Haliburton County.
              </p>
              <p className="mt-4 text-sm text-white/60">
                Through working at McKee Security you will learn to install, setup, and
                program security systems, camera surveillance systems, Starlink internet,
                networking, TV installation, Sonos installation, audio and video, cellular
                distribution, and more.
              </p>
              <p className="mt-4 text-sm text-white/50">
                {siteConfig.address.full}
              </p>
            </div>
          </FadeIn>
          <ApplyForm />
        </div>
      </section>
    </>
  );
}
