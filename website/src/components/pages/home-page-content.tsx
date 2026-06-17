"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { images } from "@/lib/site-config";
import { serviceCategories } from "@/lib/services";
import { FadeIn } from "@/components/motion/fade-in";
import { ParallaxSection } from "@/components/sections/parallax-section";
import { StatsReviewsBand } from "@/components/sections/stats-reviews-band";

function ReadMoreLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="mt-6 inline-block border-b-2 border-secondary pb-0.5 text-sm font-bold uppercase tracking-[0.15em] text-secondary transition hover:border-white hover:text-white"
    >
      read more
    </Link>
  );
}

export function HomePageContent() {
  return (
    <>
      <ParallaxSection
        image={images.heroHome}
        minHeight="760px"
        gradient
        scrollMode="hero"
        objectPosition="50% 45%"
        imageScale={1.04}
        parallaxStrength={32}
        priority
        contentClassName="relative min-h-[760px]"
      >
        <div className="mx-auto flex min-h-[760px] w-full max-w-[1400px] items-center px-6 pb-16 pt-28 lg:px-10 lg:pb-20 lg:pt-36">
          <FadeIn>
            <h6 className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-white">
              Specialized Security
            </h6>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight text-white drop-shadow-md sm:text-5xl lg:text-6xl">
              Full Home Integration
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-white/90">
              We are your one stop technology solution! You can have peace of mind
              knowing that our systems are custom designed to fit your needs.
            </p>
            <h2 className="mt-8 text-3xl font-bold text-white drop-shadow sm:text-4xl">
              Home <span className="font-bold">Technology</span>
            </h2>
            <Link
              href="/custom-installations-professional-products"
              className="mt-8 inline-flex items-center justify-center rounded-xl bg-secondary px-10 py-4 text-base font-bold lowercase text-white shadow-lg transition hover:bg-[#157ab8]"
            >
              Learn More
            </Link>
          </FadeIn>
        </div>
        <button
          type="button"
          aria-label="Scroll for more"
          className="absolute bottom-3 left-1/2 z-20 hidden -translate-x-1/2 text-white/60 lg:block"
          onClick={() =>
            window.scrollTo({ top: window.innerHeight * 0.85, behavior: "smooth" })
          }
        >
          <ChevronDown className="h-10 w-10 animate-bounce" />
        </button>
      </ParallaxSection>

      <StatsReviewsBand />

      <ParallaxSection
        image={images.browseServicesBg}
        overlay="rgba(0,0,0,0.28)"
        minHeight="520px"
        objectPosition="50% 58%"
        imageScale={1.1}
        parallaxStrength={28}
        imageInsetClassName="-inset-x-[8%] -top-[18%] -bottom-[10%]"
        contentClassName="flex min-h-[520px] items-center justify-center py-12 lg:min-h-[580px] lg:py-20"
      >
        <div className="mx-auto w-full max-w-xl px-6">
          <FadeIn>
            <div className="rounded-[38px] bg-[rgba(6,6,6,0.85)] px-6 py-12 text-center shadow-2xl sm:px-10 sm:py-14">
              <h5 className="text-sm font-bold uppercase tracking-widest text-white">
                Browse
              </h5>
              <h5 className="mt-2 text-2xl font-bold uppercase text-white sm:text-3xl">
                custom installation services
              </h5>
              <p className="mt-4 text-white/85">
                We specialize in security, camera surveillance, home audio distribution,
                home theater, networking, and cellular expansion.
              </p>
              <Link
                href="/custom-installations-professional-products"
                className="mt-8 inline-flex items-center justify-center rounded-2xl bg-primary px-16 py-4 text-lg font-bold text-white transition hover:bg-[var(--primary-hover)]"
              >
                Learn More
              </Link>
            </div>
          </FadeIn>
        </div>
      </ParallaxSection>

      <section className="border-b border-primary/20 py-14 lg:py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <FadeIn>
            <h6 className="text-sm font-bold uppercase tracking-widest text-white/80">
              Professional
            </h6>
            <h2 className="mt-2 text-3xl font-bold text-white drop-shadow-sm sm:text-4xl">
              Custom Installations
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-white/75">
              Our professional trained and fully certified technicians are ready to take
              on any custom home technology installations or renovations you may have.
            </p>
            <ReadMoreLink href="/custom-installations-professional-products" />
          </FadeIn>
        </div>
      </section>

      <section className="border-b border-primary/20 bg-[#111111] py-14 lg:py-16">
        <div className="mx-auto grid max-w-[1400px] items-center gap-10 px-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-12 xl:gap-16">
          <FadeIn className="flex justify-center lg:justify-start lg:pl-4 xl:pl-10">
            <div className="relative h-[240px] w-[240px] sm:h-[280px] sm:w-[280px] lg:h-[300px] lg:w-[300px]">
              <Image
                src={images.hat}
                alt="McKee Security"
                fill
                className="object-contain object-left"
                sizes="(max-width: 1024px) 280px, 300px"
              />
            </div>
          </FadeIn>
          <FadeIn delay={0.1}>
            <h6 className="text-sm font-bold uppercase tracking-widest text-white/70">
              Who we are
            </h6>
            <h3 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
              Why choose us?
            </h3>
            <p className="mt-4 text-white/75">
              At McKee Security and Audio Systems, we deliver comprehensive security
              solutions, camera surveillance systems, home audio distribution, home theater
              installations, networking infrastructure, and cellular expansion services.
            </p>
            <p className="mt-4 text-white/75">
              McKee Security streamlines your technology experience with custom-designed
              systems tailored precisely to your requirements, providing complete peace of
              mind through our integrated, one-stop technology solutions.
            </p>
            <ReadMoreLink href="/custom-installations-professional-products" />
          </FadeIn>
        </div>
      </section>

      <section className="bg-[#0a0a0a] py-14 lg:py-16">
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
            <ReadMoreLink href="/custom-installations-professional-products" />
          </FadeIn>
          <FadeIn
            delay={0.1}
            className="relative order-1 aspect-square w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 lg:order-2 lg:mx-auto"
          >
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

      <ParallaxSection
        image={images.sonosBg}
        overlay="rgba(0,0,0,0.35)"
        minHeight="540px"
        objectPosition="50% 60%"
        imageScale={1.06}
        parallaxStrength={36}
        contentClassName="flex min-h-[540px] items-center justify-center py-16 lg:py-20"
      >
        <div className="mx-auto flex w-full max-w-3xl justify-center px-6">
          <FadeIn className="w-full max-w-xl">
            <div className="rounded-[28px] bg-[rgba(0,0,0,0.84)] px-8 py-10 text-center sm:px-12">
              <h2 className="text-2xl font-bold text-white sm:text-3xl">THANK YOU</h2>
              <p className="mt-3 text-xl text-white/90 sm:text-2xl">
                for considering our professional services
              </p>
            </div>
          </FadeIn>
        </div>
      </ParallaxSection>
    </>
  );
}
