import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // AVIF first (smaller than WebP) with WebP fallback.
    formats: ["image/avif", "image/webp"],
    // Defining `images` serializes the resolved image config (incl. qualities)
    // into the build output, and the Vercel optimizer then REJECTS any quality
    // not listed here with a 400. So this must contain every `quality` value
    // used across the app: 75 (next/image default), 80, 82, 85.
    qualities: [75, 80, 82, 85],
  },
  async redirects() {
    return [
      { source: "/shop", destination: "/custom-installations-professional-products", permanent: true },
      { source: "/cart", destination: "/custom-installations-professional-products", permanent: true },
      { source: "/wishlist", destination: "/custom-installations-professional-products", permanent: true },
      { source: "/checkout", destination: "/contact-us", permanent: true },
      { source: "/monitoring-information", destination: "/security#monitoring", permanent: true },
      { source: "/terms-conditions", destination: "/privacy-policy", permanent: true },
      { source: "/our-courses-technician", destination: "/courses/mckee-security-technician", permanent: true },
    ];
  },
};

export default nextConfig;
