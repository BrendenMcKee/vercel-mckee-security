"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, Phone, X, Mail } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { primaryNav, siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <div className="hidden bg-[#660000] lg:block">
        <div className="mx-auto flex max-w-7xl items-center justify-end gap-6 px-6 py-2 text-sm text-white/90">
          <a
            href={`mailto:${siteConfig.email.general}`}
            className="flex items-center gap-2 transition hover:text-white"
          >
            <Mail className="h-4 w-4" />
            {siteConfig.email.general}
          </a>
          <a
            href={`tel:${siteConfig.phone.tel}`}
            className="flex items-center gap-2 font-bold transition hover:text-white"
          >
            <Phone className="h-4 w-4" />
            {siteConfig.phone.display}
          </a>
        </div>
      </div>

      <header
        className={cn(
          "sticky top-0 z-50 border-b border-white/5 transition-all duration-300",
          scrolled
            ? "bg-background/95 shadow-xl shadow-black/30 backdrop-blur-md"
            : "bg-background/80 backdrop-blur-sm",
        )}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="relative block h-14 w-44 shrink-0 sm:h-16 sm:w-52">
            <Image
              src="/images/logo.png"
              alt={siteConfig.name}
              fill
              className="object-contain object-left"
              priority
            />
          </Link>

          <nav className="hidden items-center gap-1 xl:flex">
            {primaryNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wide text-white/85 transition hover:bg-white/5 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <a
              href={`tel:${siteConfig.phone.tel}`}
              className="hidden rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#b20000] sm:inline-flex"
            >
              Call Now
            </a>
            <button
              type="button"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen(!open)}
              className="rounded-xl border border-white/15 p-2.5 text-white xl:hidden"
            >
              {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm xl:hidden"
            onClick={() => setOpen(false)}
          >
            <motion.nav
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 280, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-surface-elevated shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 p-4">
                <span className="font-bold text-white">Menu</span>
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-2 text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {primaryNav.map((item, i) => (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="block rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-wide text-white/90 transition hover:bg-white/5 hover:text-primary"
                    >
                      {item.label}
                    </Link>
                  </motion.div>
                ))}
              </div>
              <div className="border-t border-white/10 p-4">
                <a
                  href={`tel:${siteConfig.phone.tel}`}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-bold text-white"
                >
                  <Phone className="h-4 w-4" />
                  {siteConfig.phone.short}
                </a>
              </div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>

      <a
        href={`tel:${siteConfig.phone.tel}`}
        className="fixed bottom-4 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-2xl shadow-primary/40 transition hover:scale-105 hover:bg-[#b20000] sm:hidden"
        aria-label="Call McKee Security"
      >
        <Phone className="h-6 w-6" />
      </a>
    </>
  );
}
