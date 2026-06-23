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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { images, mainNav, siteConfig, type NavChild } from "@/lib/site-config";
import { NavServiceIcon } from "@/components/layout/nav-service-icon";
import { SocialIconButtons } from "@/components/ui/social-icons";
import { cn } from "@/lib/utils";
import {
  isNavItemActive,
  pathsMatch,
  scrollPageToTop,
  syncSiteHeaderHeight,
} from "@/lib/navigation";

const TOP_BAR_HEIGHT = 36;
const SCROLL_COLLAPSE = 56;
const SCROLL_EXPAND = 16;
const collapseSpring = { type: "spring" as const, stiffness: 420, damping: 44, mass: 0.85 };
const collapseInstant = { duration: 0 };

function syncHeaderScrolledClass(scrolled: boolean) {
  document.documentElement.classList.toggle("header-scrolled", scrolled);
  document.documentElement.classList.add("header-ready");
}

function ServiceDropdown({
  items,
  pathname,
  onNavigate,
  onSamePageNav,
}: {
  items: NavChild[];
  pathname: string;
  onNavigate?: () => void;
  onSamePageNav: (event: React.MouseEvent<HTMLAnchorElement>, href: string) => void;
}) {
  return (
    <div className="min-w-[360px] rounded-lg border border-white/10 bg-[#1a1a1a] py-2 shadow-2xl">
      {items.map((item) => {
        const active = isNavItemActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={(event) => {
              onSamePageNav(event, item.href);
              onNavigate?.();
            }}
            className={cn(
              "flex items-center gap-3 whitespace-nowrap px-4 py-2.5 text-sm font-bold uppercase tracking-wide transition hover:bg-white/5",
              active ? "text-primary" : "text-white/85 hover:text-primary",
            )}
          >
            <NavServiceIcon icon={item.icon} />
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
  const [spacerHeight, setSpacerHeight] = useState<number | undefined>(undefined);
  const headerRef = useRef<HTMLElement>(null);
  const dropdownRef = useRef<HTMLLIElement>(null);

  useLayoutEffect(() => {
    const syncFromScroll = () => {
      const next = window.scrollY > SCROLL_COLLAPSE;
      setScrolled(next);
      syncHeaderScrolledClass(next);
      if (headerRef.current) {
        const height = headerRef.current.getBoundingClientRect().height;
        setSpacerHeight(height);
        syncSiteHeaderHeight(height);
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

  // On route change, reset the collapsed state during render (instead of inside
  // an effect) so a new page starts expanded without a cascading effect render.
  const [scrollResetPath, setScrollResetPath] = useState(pathname);
  if (scrollResetPath !== pathname) {
    setScrollResetPath(pathname);
    setScrolled(false);
  }

  useLayoutEffect(() => {
    syncHeaderScrolledClass(false);
    requestAnimationFrame(() => {
      if (headerRef.current) {
        const height = headerRef.current.getBoundingClientRect().height;
        setSpacerHeight(height);
        syncSiteHeaderHeight(height);
      }
    });
  }, [pathname]);

  useEffect(() => {
    const onScrollTop = () => {
      setScrolled(false);
      syncHeaderScrolledClass(false);
      requestAnimationFrame(() => {
        if (headerRef.current) {
          const height = headerRef.current.getBoundingClientRect().height;
          setSpacerHeight(height);
          syncSiteHeaderHeight(height);
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
      const height = header.getBoundingClientRect().height;
      setSpacerHeight(height);
      syncSiteHeaderHeight(height);
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
              {siteConfig.topBarLeftTagline}
            </strong>
            <div className="flex items-center gap-3">
              <span
                className="h-4 w-px shrink-0 bg-white/50"
                aria-hidden="true"
              />
              <strong className="font-bold uppercase tracking-wide">
                {siteConfig.topBarRightTagline}
              </strong>
              <SocialIconButtons />
            </div>
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
              className="relative h-[86px] w-[210px] shrink-0 justify-self-center max-lg:-translate-x-1 sm:w-[220px] lg:h-[70px] lg:w-[200px] lg:translate-x-0 lg:justify-self-auto"
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
                {mainNav.map((item) => {
                  const childHrefs = item.children?.map((child) => child.href) ?? [];
                  const active = isNavItemActive(pathname, item.href, childHrefs);

                  return item.children ? (
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
                        className={cn(
                          "flex items-center gap-1 whitespace-nowrap px-4 py-2 text-[13px] font-bold uppercase tracking-wide transition",
                          active ? "text-primary" : "text-white hover:text-primary",
                        )}
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
                              items={item.children}
                              pathname={pathname}
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
                        className={cn(
                          "block whitespace-nowrap px-4 py-2 text-[13px] font-bold uppercase tracking-wide transition",
                          active ? "text-primary" : "text-white hover:text-primary",
                        )}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
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
                  {mainNav.map((item) => {
                    const childHrefs = item.children?.map((child) => child.href) ?? [];
                    const active = isNavItemActive(pathname, item.href, childHrefs);

                    return item.children ? (
                      <div key={item.href}>
                        <button
                          type="button"
                          onClick={() => setMobileServicesOpen(!mobileServicesOpen)}
                          className={cn(
                            "flex w-full items-center justify-between px-4 py-3 text-sm font-bold uppercase",
                            active ? "text-primary" : "text-white",
                          )}
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
                            {item.children.map((child) => {
                              const childActive = isNavItemActive(pathname, child.href);
                              return (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  onClick={(event) => {
                                    handleSamePageNav(event, child.href);
                                    closeMobile();
                                  }}
                                  className={cn(
                                    "flex items-center gap-3 px-4 py-2.5 text-xs font-bold uppercase hover:text-primary",
                                    childActive ? "text-primary" : "text-white/75",
                                  )}
                                >
                                  <NavServiceIcon icon={child.icon} className="h-3.5 w-3.5 shrink-0 text-primary" />
                                  <span>{child.label}</span>
                                </Link>
                              );
                            })}
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
                        className={cn(
                          "block px-4 py-3 text-sm font-bold uppercase hover:text-primary",
                          active ? "text-primary" : "text-white",
                        )}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
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
        // The min-heights reserve the collapsed header height on first paint
        // (before JS measures the real height) so content doesn't jump down
        // once the spacer is sized — keeps CLS near zero on load. The values
        // are <= the actual header height, so the measured inline height always
        // takes over cleanly with no gap.
        className="pointer-events-none shrink-0 min-h-[100px] lg:min-h-[140px]"
        style={{ height: spacerHeight }}
      />
    </>
  );
}
