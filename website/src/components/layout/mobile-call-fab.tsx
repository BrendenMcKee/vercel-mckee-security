import { Phone } from "lucide-react";
import { siteConfig } from "@/lib/site-config";

export function MobileCallFab() {
  return (
    <a
      href={`tel:${siteConfig.phone.tel}`}
      className="fixed bottom-4 right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-2xl shadow-black/50 lg:hidden"
      aria-label="Call McKee Security"
    >
      <Phone className="h-6 w-6" />
    </a>
  );
}
