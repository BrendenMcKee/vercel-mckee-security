const slugPreloadImages: Record<string, string[]> = {
  security: [
    "/images/services/security-wireless.jpg",
    "/images/services/security-wired.jpg",
    "/images/services/security-facilities.jpg",
  ],
  "camera-surveillance": [
    "/images/services/cameras.png",
    "/images/services/cameras-white.png",
  ],
  "networking-cellular-expansion": [
    "/images/services/networking.png",
    "/images/services/gateways.png",
  ],
  "audio-video": [
    "/images/services/work/av-outdoor-tv-mount.jpg",
    "/images/services/work/av-system-design.jpg",
  ],
  starlink: ["/images/services/work/starlink-mounting.jpg"],
};

export function getElementorPreloadImages(slug: string) {
  return slugPreloadImages[slug] ?? [];
}

export function enhanceElementorImages(root: HTMLElement) {
  const firstImg = root.querySelector("img");

  root.querySelectorAll("img").forEach((img) => {
    const isHero =
      img === firstImg ||
      img.classList.contains("mks2025-sec-hero-image") ||
      img.classList.contains("hero-image");

    if (isHero) {
      img.loading = "eager";
      img.setAttribute("fetchpriority", "high");
    }

    if (!img.complete) {
      img.classList.add("mckee-elementor-img-loading");
      const reveal = () => img.classList.remove("mckee-elementor-img-loading");
      img.addEventListener("load", reveal, { once: true });
      img.addEventListener("error", reveal, { once: true });
    }
  });

  root.querySelectorAll<HTMLElement>("[style*='background-image']").forEach((el) => {
    const match = el.getAttribute("style")?.match(/url\(['"]?([^'")]+)/);
    if (!match?.[1]) return;
    const preload = new window.Image();
    preload.src = match[1];
  });
}
