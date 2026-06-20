import type { Metadata } from "next";
import { Hero } from "@/components/sections/hero";
import { TeamGrid } from "@/components/sections/team-grid";
import { FadeIn } from "@/components/motion/fade-in";
import { SectionHeading } from "@/components/ui/section-heading";
import { images } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "About Us",
  description: "Meet Team McKee. Family-owned security and technology experts serving Haliburton for over 30 years.",
};

export default function AboutPage() {
  return (
    <>
      <Hero
        eyebrow="About Us"
        title="Meet The Team"
        subtitle="Three generations of security and technology excellence in the Haliburton region."
        image={images.heroAbout}
        objectPosition="50% 32%"
        imageScale={1}
        compact
        overlay="medium"
      />

      <TeamGrid />

      <section className="bg-surface py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-12 lg:grid-cols-2">
            <FadeIn>
              <SectionHeading align="left" title="Our mission" />
              <p className="mt-4 text-white/65">
                On the cutting edge of technology, McKee Security continues to rapidly
                grow in order to keep pace and set trends within the areas of security,
                camera surveillance, structured wiring, networking, audio and video,
                and home automation needs.
              </p>
            </FadeIn>
            <FadeIn delay={0.1}>
              <SectionHeading align="left" title="Our core values" />
              <p className="mt-4 text-white/65">
                At McKee Security and Audio Systems we strive to operate with integrity,
                respect, and dependability. We serve our customers in fulfilling their
                wants and needs.
              </p>
            </FadeIn>
          </div>
        </div>
      </section>
    </>
  );
}
