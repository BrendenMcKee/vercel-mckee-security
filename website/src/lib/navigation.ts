export function pathsMatch(pathname: string, href: string) {
  const target = href.split("#")[0].split("?")[0] || "/";
  return pathname === target;
}

/** True when the current route matches a top-level nav item (and its dropdown routes). */
export function isNavItemActive(
  pathname: string,
  href: string,
  childHrefs: string[] = [],
) {
  const targets = [href, ...childHrefs];
  return targets.some((target) => {
    const base = target.split("#")[0].split("?")[0] || "/";
    if (base === "/") return pathname === "/";
    return pathname === base || pathname.startsWith(`${base}/`);
  });
}

export function syncSiteHeaderHeight(height: number) {
  document.documentElement.style.setProperty("--site-header-height", `${height}px`);
}

export function scrollPageToTop() {
  const root = document.documentElement;
  const previousBehavior = root.style.scrollBehavior;
  root.style.scrollBehavior = "auto";
  window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  root.scrollTop = 0;
  document.body.scrollTop = 0;
  root.style.scrollBehavior = previousBehavior;
  root.classList.remove("header-scrolled");
  window.dispatchEvent(new CustomEvent("mckee:scroll-top"));
}
