"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { images } from "@/lib/site-config";
import { serviceCategories } from "@/lib/services";
import { FadeIn } from "@/components/motion/fade-in";

function ParallaxSection({
  image,
  overlay = "rgba(17,17,17,0.35)",
  minHeight = "655px",
  objectPosition = "50% 49%",
  children,
  className = "",
}: {
  image: string;
  overlay?: string;
  minHeight?: string;
  objectPosition?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);

  return (
    <section
      ref={ref}
      className={`relative overflow-hidden ${className}`}
      style={{ minHeight }}
    >
      <motion.div style={{ y }} className="absolute inset-0 scale-110">
        <Image
          src={image}
          alt=""
          fill
          className="object-cover"
          style={{ objectPosition }}
          sizes="100vw"
        />
        <div className="absolute inset-0" style={{ backgroundColor: overlay }} />
      </motion.div>
      <div className="relative z-10">{children}</div>
    </section>
  );
}

export function HomePageContent() {
  return (
    <>
      {/* Hero */}
      <ParallaxSection image={images.heroHome} minHeight="760px">
        <div className="mx-auto flex max-w-[1400px] flex-col justify-center px-6 pb-24 pt-32 lg:px-10 lg:pb-32 lg:pt-40">
          <FadeIn>
            <h6 className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-white">
              Specialized Security
            </h6>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
              Full Home Integration
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-white/90">
              We are your one stop technology solution! You can have peace of mind
              knowing that our systems are custom designed to fit your needs.
            </p>
            <h2 className="mt-8 text-3xl font-bold text-white sm:text-4xl">
              Home <span className="font-bold">Technology</span>
            </h2>
            <Link
              href="/custom-installations-professional-products"
              className="mt-8 inline-flex items-center justify-center rounded-xl bg-secondary px-10 py-4 text-base font-bold lowercase text-white shadow-lg transition hover:bg-[#157ab8]"
            >
              Learn More
            </Link>
          </FadeIn>
          <button
            type="button"
            aria-label="Scroll for more"
            className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 text-white/60 lg:block"
            onClick={() =>
              window.scrollTo({ top: window.innerHeight * 0.85, behavior: "smooth" })
            }
          >
            <ChevronDown className="h-10 w-10 animate-bounce" />
          </button>
        </div>
      </ParallaxSection>

      {/* Desktop promo banner */}
      <section className="hidden md:block">
        <Image
          src={images.bannerDesktop}
          alt="McKee Security services"
          width={5141}
          height={1287}
          className="h-auto w-full"
          priority
        />
      </section>

      {/* Mobile promo banner */}
      <section className="md:hidden">
        <Image
          src={images.bannerMobile}
          alt="McKee Security services"
          width={3184}
          height={1287}
          className="h-auto w-full"
        />
      </section>

      {/* Google reviews placeholder */}
      <section className="bg-[#111111] py-8">
        <div className="mx-auto max-w-[1400px] px-6 text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-white/40">
            Google Reviews
          </p>
          <p className="mt-2 text-white/60">
            Trusted by homeowners and businesses across Haliburton County.
          </p>
        </div>
      </section>

      {/* Browse custom installation services (parallax box) */}
      <ParallaxSection
        image={images.browseServicesBg}
        overlay="rgba(0,0,0,0.17)"
        minHeight="420px"
        objectPosition="49% 52%"
        className="flex items-center py-16 lg:min-h-[540px] lg:py-32"
      >
        <div className="mx-auto w-full max-w-xl px-6">
          <FadeIn>
            <div className="rounded-[38px] bg-[rgba(6,6,6,0.85)] px-6 py-14 text-center shadow-2xl sm:px-10 sm:py-16">
              <h5 className="text-sm font-bold uppercase tracking-widest text-white">
                Browse
              </h5>
              <h5 className="mt-2 text-2xl font-bold uppercase text-white sm:text-3xl">
                custom installation services
              </h5>
              <p className="mt-4 text-white/80">
                We specialize in security, camera surveillance, home audio distribution,
                home theater, networking, and cellular expansion.
              </p>
              <Link
                href="/custom-installations-professional-products"
                className="mt-8 inline-flex items-center justify-center rounded-2xl bg-primary px-16 py-4 text-lg font-bold text-white transition hover:bg-[#b20000]"
              >
                Learn More
              </Link>
            </div>
          </FadeIn>
        </div>
      </ParallaxSection>

      {/* Professional Custom Installations */}
      <section className="py-10 lg:py-14">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <FadeIn>
            <h6 className="text-sm font-bold uppercase tracking-widest text-white/70">
              Professional
            </h6>
            <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
              Custom Installations
            </h2>
            <p className="mt-4 text-lg text-white/65">
              Our professional trained and fully certified technicians are ready to take
              on any custom home technology installations or renovations you may have.
            </p>
            <Link
              href="/custom-installations-professional-products"
              className="mt-6 inline-flex items-center gap-1 border-b-2 border-primary pb-1 text-sm font-bold uppercase tracking-wide text-primary transition hover:text-white"
            >
              read more <ChevronRight className="h-4 w-4" />
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* Why choose us + hat image */}
      <section className="py-8 lg:py-12">
        <div className="mx-auto grid max-w-[1400px] items-center gap-10 px-6 lg:grid-cols-2 lg:gap-16">
          <FadeIn className="relative aspect-square max-h-[480px] w-full overflow-hidden rounded-2xl lg:max-h-none">
            <Image
              src={images.hat}
              alt="McKee Security"
              fill
              className="object-contain object-center"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </FadeIn>
          <FadeIn delay={0.1}>
            <h6 className="text-sm font-bold uppercase tracking-widest text-white/70">
              Who we are
            </h6>
            <h3 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
              Why choose us?
            </h3>
            <p className="mt-4 text-white/70">
              At McKee Security and Audio Systems, we deliver comprehensive security
              solutions, camera surveillance systems, home audio distribution, home theater
              installations, networking infrastructure, and cellular expansion services.
            </p>
            <p className="mt-4 text-white/70">
              McKee Security streamlines your technology experience with custom-designed
              systems tailored precisely to your requirements, providing complete peace of
              mind through our integrated, one-stop technology solutions.
            </p>
            <Link
              href="/custom-installations-professional-products"
              className="mt-6 inline-flex items-center gap-1 text-sm font-bold uppercase tracking-wide text-secondary transition hover:text-white"
            >
              read more <ChevronRight className="h-4 w-4" />
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* What we do + team photo */}
      <section className="pb-16 pt-4 lg:pb-20">
        <div className="mx-auto grid max-w-[1400px] items-center gap-10 px-6 lg:grid-cols-2 lg:gap-12">
          <FadeIn className="order-2 lg:order-1">
            <h6 className="text-sm font-bold uppercase tracking-widest text-white/70">
              Our Services at a Glance
            </h6>
            <h3 className="mt-2 text-3xl font-bold text-white">What we do</h3>
            <div className="mt-6 space-y-6 text-white/80">
              {serviceCategories.map((cat) => (
                <div key={cat.id}>
                  <p className="font-bold text-white">{cat.label}</p>
                  <ul className="mt-2 space-y-1 pl-0 text-sm">
                    {cat.items.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="text-white/40">-</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <Link
              href="/custom-installations-professional-products"
              className="mt-6 inline-flex items-center gap-1 text-sm font-bold uppercase tracking-wide text-secondary transition hover:text-white"
            >
              read more <ChevronRight className="h-4 w-4" />
            </Link>
          </FadeIn>
          <FadeIn delay={0.1} className="relative order-1 aspect-square w-full overflow-hidden rounded-2xl lg:order-2">
            <Image
              src={images.teamInstall}
              alt="McKee Security installation team"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </FadeIn>
        </div>
      </section>

      {/* Thank you / Sonos parallax */}
      <ParallaxSection
        image={images.sonosBg}
        overlay="rgba(0,0,0,0.32)"
        minHeight="400px"
        objectPosition="49% 100%"
        className="flex items-center py-20 lg:py-24"
      >
        <div className="mx-auto w-full max-w-3xl px-6 text-center">
          <FadeIn>
            <div className="mx-auto max-w-xl rounded-[28px] bg-[rgba(0,0,0,0.84)] px-6 py-8 sm:px-10">
              <h2 className="text-2xl font-bold text-white sm:text-3xl">THANK YOU</h2>
              <p className="mt-2 text-xl text-white/90 sm:text-2xl">
                for considering our professional services
              </p>
            </div>
          </FadeIn>
        </div>
      </ParallaxSection>
    </>
  );
}
