"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
import { images, mainNav, siteConfig, type NavChild } from "@/lib/site-config";
import { SocialIconButtons } from "@/components/ui/social-icons";
import { cn } from "@/lib/utils";
import { pathsMatch, scrollPageToTop } from "@/lib/navigation";

const TOP_BAR_HEIGHT = 36;
const SCROLL_COLLAPSE = 56;
const SCROLL_EXPAND = 16;
const collapseSpring = { type: "spring" as const, stiffness: 420, damping: 44, mass: 0.85 };
const collapseInstant = { duration: 0 };

function syncHeaderScrolledClass(scrolled: boolean) {
  document.documentElement.classList.toggle("header-scrolled", scrolled);
  document.documentElement.classList.add("header-ready");
}

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
  onSamePageNav,
}: {
  children: NavChild[];
  onNavigate?: () => void;
  onSamePageNav: (event: React.MouseEvent<HTMLAnchorElement>, href: string) => void;
}) {
  return (
    <div className="min-w-[360px] rounded-lg border border-white/10 bg-[#1a1a1a] py-2 shadow-2xl">
      {children.map((item) => {
        const Icon = item.icon ? childIcons[item.icon] : Home;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={(event) => {
              onSamePageNav(event, item.href);
              onNavigate?.();
            }}
            className="flex items-center gap-3 whitespace-nowrap px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-white/85 transition hover:bg-white/5 hover:text-primary"
          >
            <Icon className="h-4 w-4 shrink-0 text-primary" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [collapseMotionEnabled, setCollapseMotionEnabled] = useState(false);
  const [spacerHeight, setSpacerHeight] = useState(0);
  const headerRef = useRef<HTMLElement>(null);
  const dropdownRef = useRef<HTMLLIElement>(null);

  useLayoutEffect(() => {
    const syncFromScroll = () => {
      const next = window.scrollY > SCROLL_COLLAPSE;
      setScrolled(next);
      syncHeaderScrolledClass(next);
      if (headerRef.current) {
        setSpacerHeight(headerRef.current.getBoundingClientRect().height);
      }
    };

    syncFromScroll();
    const t0 = window.setTimeout(syncFromScroll, 0);
    const t1 = window.setTimeout(syncFromScroll, 100);
    window.addEventListener("pageshow", syncFromScroll);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setCollapseMotionEnabled(true);
        syncFromScroll();
      });
    });

    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.removeEventListener("pageshow", syncFromScroll);
    };
  }, []);

  useLayoutEffect(() => {
    setScrolled(false);
    syncHeaderScrolledClass(false);
    requestAnimationFrame(() => {
      if (headerRef.current) {
        setSpacerHeight(headerRef.current.getBoundingClientRect().height);
      }
    });
  }, [pathname]);

  useEffect(() => {
    const onScrollTop = () => {
      setScrolled(false);
      syncHeaderScrolledClass(false);
      requestAnimationFrame(() => {
        if (headerRef.current) {
          setSpacerHeight(headerRef.current.getBoundingClientRect().height);
        }
      });
    };
    window.addEventListener("mckee:scroll-top", onScrollTop);
    return () => window.removeEventListener("mckee:scroll-top", onScrollTop);
  }, []);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const syncSpacer = () => {
      setSpacerHeight(header.getBoundingClientRect().height);
    };

    syncSpacer();
    const observer = new ResizeObserver(syncSpacer);
    observer.observe(header);
    window.addEventListener("resize", syncSpacer, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncSpacer);
    };
  }, []);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        setScrolled((prev) => {
          let next = prev;
          if (!prev && y > SCROLL_COLLAPSE) next = true;
          if (prev && y < SCROLL_EXPAND) next = false;
          syncHeaderScrolledClass(next);
          return next;
        });
        ticking = false;
      });
    };
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

  const handleSamePageNav = (
    event: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    if (!pathsMatch(pathname, href)) return;
    event.preventDefault();
    scrollPageToTop();
    router.refresh();
  };

  return (
    <>
      <header ref={headerRef} className="fixed inset-x-0 top-0 z-50 bg-[#0a0a0a]">
        <motion.div
          data-site-top-bar
          className="hidden overflow-hidden bg-[#660000] will-change-[height,opacity] lg:block"
          initial={false}
          animate={{
            height: scrolled ? 0 : TOP_BAR_HEIGHT,
            opacity: scrolled ? 0 : 1,
          }}
          transition={collapseMotionEnabled ? collapseSpring : collapseInstant}
        >
          <div className="mx-auto flex h-9 max-w-[1400px] items-center justify-between px-6 text-xs text-white">
            <strong className="font-bold uppercase tracking-wide">
              {siteConfig.topBarTagline}
            </strong>
            <SocialIconButtons />
          </div>
        </motion.div>

        <div
          className={cn(
            "border-b border-white/5 bg-[#0a0a0a] transition-shadow duration-300",
            scrolled && "shadow-lg shadow-black/40",
          )}
        >
          <div className="mx-auto grid h-[100px] max-w-[1400px] grid-cols-[1fr_auto_1fr] items-center px-4 lg:flex lg:gap-6 lg:px-6">
            <div className="flex items-center justify-start lg:hidden">
              <a
                href={`mailto:${siteConfig.email.general}`}
                aria-label="Email McKee Security"
                className="flex h-11 w-11 items-center justify-center rounded-lg text-primary transition hover:text-[var(--primary-hover)]"
              >
                <Mail className="h-6 w-6" />
              </a>
            </div>

            <Link
              href="/"
              onClick={(event) => handleSamePageNav(event, "/")}
              className="relative h-[86px] w-[210px] shrink-0 justify-self-center sm:w-[220px] lg:h-[70px] lg:w-[200px] lg:justify-self-auto"
            >
              <Image
                src={images.logo}
                alt={siteConfig.name}
                fill
                className="object-contain object-center lg:object-left"
                priority
              />
            </Link>

            <nav className="hidden min-w-0 flex-1 items-center lg:flex">
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
                            <ServiceDropdown
                              children={item.children}
                              onSamePageNav={handleSamePageNav}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </li>
                  ) : (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={(event) => handleSamePageNav(event, item.href)}
                        className="block whitespace-nowrap px-4 py-2 text-[13px] font-bold uppercase tracking-wide text-white transition hover:text-primary"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            </nav>

            <div className="flex items-center justify-end lg:hidden">
              <button
                type="button"
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                onClick={() => setMobileOpen(!mobileOpen)}
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/15 text-white"
              >
                {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        <div className="hidden border-b border-white/5 bg-[#3f3f3f] lg:block">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-8 gap-y-2 px-6 py-2.5 text-xs font-bold uppercase tracking-wide text-white">
            <span className="flex items-center gap-2 text-white/85">
              <Clock className="h-4 w-4 shrink-0" />
              {siteConfig.hours}
            </span>
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
                                onClick={(event) => {
                                  handleSamePageNav(event, child.href);
                                  closeMobile();
                                }}
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
                        onClick={(event) => {
                          handleSamePageNav(event, item.href);
                          closeMobile();
                        }}
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
      </header>

      <div
        aria-hidden
        className="pointer-events-none shrink-0"
        style={{ height: spacerHeight }}
      />
    </>
  );
}
