"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Menu,
  Phone,
  X,
  Mail,
  Clock,
  ChevronDown,
  Home,
  Lock,
  Camera,
  Network,
  Tv,
  Satellite,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { mainNav, siteConfig, type NavChild } from "@/lib/site-config";
import { SocialIconButtons } from "@/components/ui/social-icons";
import { cn } from "@/lib/utils";

const childIcons = {
  home: Home,
  lock: Lock,
  camera: Camera,
  network: Network,
  tv: Tv,
  satellite: Satellite,
};

function ServiceDropdown({
  children,
  onNavigate,
}: {
  children: NavChild[];
  onNavigate?: () => void;
}) {
  return (
    <div className="min-w-[280px] rounded-lg border border-white/10 bg-[#1a1a1a] py-2 shadow-2xl">
      {children.map((item) => {
        const Icon = item.icon ? childIcons[item.icon] : Home;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-white/85 transition hover:bg-white/5 hover:text-primary"
          >
            <Icon className="h-4 w-4 shrink-0 text-primary" />
            <span className="leading-tight">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setServicesOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const closeMobile = () => {
    setMobileOpen(false);
    setMobileServicesOpen(false);
  };

  return (
    <header className="sticky top-0 z-50">
      <div
        className={cn(
          "hidden overflow-hidden bg-[#660000] transition-all duration-300 ease-out lg:block",
          scrolled ? "max-h-0 opacity-0" : "max-h-12 opacity-100",
        )}
      >
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-1.5 text-xs text-white">
          <strong className="font-bold uppercase tracking-wide">
            {siteConfig.topBarTagline}
          </strong>
          <SocialIconButtons />
        </div>
      </div>

      <div
        className={cn(
          "border-b border-white/5 bg-[rgba(10,10,10,0.92)] backdrop-blur-md transition-shadow",
          scrolled && "shadow-lg shadow-black/40",
        )}
      >
        <div className="mx-auto flex h-[100px] max-w-[1400px] items-center gap-6 px-4 lg:px-6">
          <Link href="/" className="relative h-[70px] w-[180px] shrink-0 lg:w-[200px]">
            <Image
              src="/images/logo.png"
              alt={siteConfig.name}
              fill
              className="object-contain object-left"
              priority
            />
          </Link>

          <nav className="hidden flex-1 items-center lg:flex">
            <ul className="flex items-center gap-0">
              {mainNav.map((item) =>
                item.children ? (
                  <li
                    key={item.href}
                    ref={dropdownRef}
                    className="relative"
                    onMouseEnter={() => setServicesOpen(true)}
                    onMouseLeave={() => setServicesOpen(false)}
                  >
                    <button
                      type="button"
                      onClick={() => setServicesOpen((v) => !v)}
                      className="flex items-center gap-1 whitespace-nowrap px-4 py-2 text-[13px] font-bold uppercase tracking-wide text-white transition hover:text-primary"
                    >
                      {item.label}
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 transition",
                          servicesOpen && "rotate-180",
                        )}
                      />
                    </button>
                    <AnimatePresence>
                      {servicesOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          transition={{ duration: 0.15 }}
                          className="absolute left-0 top-full z-50 pt-1"
                        >
                          <ServiceDropdown children={item.children} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </li>
                ) : (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="block whitespace-nowrap px-4 py-2 text-[13px] font-bold uppercase tracking-wide text-white transition hover:text-primary"
                    >
                      {item.label}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </nav>

          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen(!mobileOpen)}
            className="ml-auto rounded-lg border border-white/15 p-2.5 text-white lg:hidden"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      <div className="hidden border-b border-white/5 bg-[rgba(63,63,63,0.95)] lg:block">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-2.5 text-xs font-bold uppercase tracking-wide text-white">
          <span className="flex items-center gap-2 text-white/85">
            <Clock className="h-4 w-4 shrink-0" />
            {siteConfig.hours}
          </span>
          <div className="flex items-center gap-8">
            <a
              href={`mailto:${siteConfig.email.general}`}
              className="flex items-center gap-2 transition hover:text-primary"
            >
              <Mail className="h-4 w-4 shrink-0" />
              Contact
            </a>
            <a
              href={`tel:${siteConfig.phone.tel}`}
              className="flex items-center gap-2 transition hover:text-primary"
            >
              <Phone className="h-4 w-4 shrink-0" />
              {siteConfig.phone.display}
            </a>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 lg:hidden"
            onClick={closeMobile}
          >
            <motion.nav
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-[#1a1a1a]"
            >
              <div className="flex items-center justify-between border-b border-white/10 p-4">
                <span className="font-bold uppercase text-white">Menu</span>
                <button type="button" onClick={closeMobile} aria-label="Close">
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {mainNav.map((item) =>
                  item.children ? (
                    <div key={item.href}>
                      <button
                        type="button"
                        onClick={() => setMobileServicesOpen(!mobileServicesOpen)}
                        className="flex w-full items-center justify-between px-4 py-3 text-sm font-bold uppercase text-white"
                      >
                        {item.label}
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition",
                            mobileServicesOpen && "rotate-180",
                          )}
                        />
                      </button>
                      {mobileServicesOpen && (
                        <div className="border-l-2 border-primary/40 pl-2">
                          {item.children.map((child) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={closeMobile}
                              className="block px-4 py-2.5 text-xs font-bold uppercase text-white/75 hover:text-primary"
                            >
                              {child.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMobile}
                      className="block px-4 py-3 text-sm font-bold uppercase text-white hover:text-primary"
                    >
                      {item.label}
                    </Link>
                  ),
                )}
              </div>
              <div className="space-y-2 border-t border-white/10 p-4">
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
        className="fixed bottom-4 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-2xl lg:hidden"
        aria-label="Call McKee Security"
      >
        <Phone className="h-6 w-6" />
      </a>
    </header>
  );
}
