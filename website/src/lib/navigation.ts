export function pathsMatch(pathname: string, href: string) {
  const target = href.split("#")[0].split("?")[0] || "/";
  return pathname === target;
}

export function scrollPageToTop() {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  document.documentElement.classList.remove("header-scrolled");
  window.dispatchEvent(new CustomEvent("mckee:scroll-top"));
}
