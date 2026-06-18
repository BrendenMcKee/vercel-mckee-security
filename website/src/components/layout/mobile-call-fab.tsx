"use client";

import { Phone } from "lucide-react";
import { usePathname } from "next/navigation";
import { siteConfig } from "@/lib/site-config";

export function MobileCallFab() {
  const pathname = usePathname();

  // Hide the floating call button on the internal Data Drops tool.
  if (pathname?.startsWith("/data-drops-")) return null;

  return (
    <a
      href={`tel:${siteConfig.phone.tel}`}
      className="fixed bottom-4 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-2xl shadow-black/50 lg:hidden"
      aria-label="Call McKee Security"
    >
      <Phone className="h-6 w-6" />
    </a>
  );
}
