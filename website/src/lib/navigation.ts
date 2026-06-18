export function pathsMatch(pathname: string, href: string) {
  const target = href.split("#")[0].split("?")[0] || "/";
  return pathname === target;
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
