import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page Not Found",
  robots: { index: false, follow: false },
};

const quickLinks = [
  { label: "Home", href: "/" },
  { label: "Our Services", href: "/custom-installations-professional-products" },
  { label: "Gallery", href: "/gallery" },
  { label: "About Us", href: "/about-us" },
  { label: "Contact Us", href: "/contact-us" },
];

export default function NotFound() {
  return (
    <section className="relative overflow-hidden">
      {/* soft brand glow behind the content */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 size-144 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl"
      />
      <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-12 px-6 py-20 md:flex-row md:gap-16 md:py-28">
        <div className="relative shrink-0">
          <div className="absolute -inset-3 rounded-4xl bg-primary/20 blur-xl" aria-hidden />
          <Image
            src="/images/404-rat.jpg"
            alt="A McKee Security technician riding a giant rat through a wasteland, asking why everyone is ignoring him"
            width={600}
            height={900}
            priority
            className="relative w-56 rounded-3xl border border-white/10 shadow-2xl shadow-black/60 sm:w-64 md:w-72"
          />
        </div>

        <div className="text-center md:text-left">
          <p className="font-accent text-3xl text-secondary">Well, this is awkward…</p>
          <h1 className="mt-1 text-7xl font-black tracking-tight text-white sm:text-8xl">404</h1>
          <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl">
            Why is everyone ignoring this page?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-white/70 leading-relaxed md:mx-0">
            The page you&apos;re looking for has scurried off, or never existed in the first
            place. Don&apos;t worry though — our crew (and our trusty steed) will point you back in
            the right direction.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3 md:justify-start">
            <Button href="/" size="lg">
              Back to Home
            </Button>
            <Button href="/gallery" variant="outline" size="lg">
              Browse the Gallery
            </Button>
          </div>

          <div className="mt-8">
            <p className="text-xs font-bold uppercase tracking-widest text-white/40">
              Or try one of these
            </p>
            <ul className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm md:justify-start">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-white/70 underline-offset-4 transition-colors hover:text-white hover:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
