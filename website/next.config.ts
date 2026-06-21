import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // AVIF first (smaller than WebP) with WebP fallback. `qualities` is left
    // unset on purpose: setting it makes the optimizer reject any quality not
    // in the list, and we use a range of per-image quality values.
    formats: ["image/avif", "image/webp"],
  },
  async redirects() {
    return [
      { source: "/shop", destination: "/custom-installations-professional-products", permanent: true },
      { source: "/cart", destination: "/custom-installations-professional-products", permanent: true },
      { source: "/wishlist", destination: "/custom-installations-professional-products", permanent: true },
      { source: "/checkout", destination: "/contact-us", permanent: true },
      { source: "/monitoring-information", destination: "/security#monitoring", permanent: true },
      { source: "/terms-conditions", destination: "/privacy-policy", permanent: true },
      { source: "/login", destination: "/our-courses", permanent: true },
      { source: "/registration", destination: "/our-courses", permanent: true },
      { source: "/registration-success", destination: "/our-courses", permanent: true },
      { source: "/profile", destination: "/our-courses", permanent: true },
      { source: "/user-dashboard", destination: "/our-courses", permanent: true },
      { source: "/our-courses-technician", destination: "/courses/mckee-security-technician", permanent: true },
    ];
  },
};

export default nextConfig;
