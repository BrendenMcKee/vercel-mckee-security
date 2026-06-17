import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
