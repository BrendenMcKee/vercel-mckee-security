export const SERVICE_QUOTE_SECTION_ID = "quote";

const QUOTE_HEADER_SELECTOR = ".mckee-service-quote-header";
const DEFAULT_HEADER_HEIGHT = 88;
const EXTRA_SCROLL_OFFSET = 16;

function getScrollOffset() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(
    "--site-header-height",
  );
  const headerHeight = Number.parseInt(raw, 10);
  return (Number.isFinite(headerHeight) ? headerHeight : DEFAULT_HEADER_HEIGHT) + EXTRA_SCROLL_OFFSET;
}

export function getServiceQuoteScrollTarget() {
  const section = document.getElementById(SERVICE_QUOTE_SECTION_ID);
  if (!section) return null;
  return section.querySelector<HTMLElement>(QUOTE_HEADER_SELECTOR) ?? section;
}

export function scrollToServiceQuote(behavior: ScrollBehavior = "smooth") {
  const target = getServiceQuoteScrollTarget();
  if (!target) return false;

  const top = target.getBoundingClientRect().top + window.scrollY - getScrollOffset();
  window.scrollTo({ top: Math.max(0, top), behavior });
  return true;
}
