import Link from "next/link";
import { MapPin, Phone, Mail, ExternalLink } from "lucide-react";
import { footerNav, siteConfig } from "@/lib/site-config";

const socialLinks = [
  { label: "Instagram", href: siteConfig.social.instagram },
  { label: "Facebook", href: siteConfig.social.facebook },
  { label: "YouTube", href: siteConfig.social.youtube },
];

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <h3 className="mb-4 text-lg font-bold text-white">{siteConfig.name}</h3>
          <p className="text-sm leading-relaxed text-white/60">
            {siteConfig.tagline}. Serving {siteConfig.region} for over{" "}
            {siteConfig.yearsInBusiness} years.
          </p>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-white">
            Quick Links
          </h3>
          <ul className="space-y-2">
            {footerNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm text-white/60 transition hover:text-primary"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-white">
            Contact
          </h3>
          <ul className="space-y-3 text-sm text-white/60">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              {siteConfig.address.full}
            </li>
            <li>
              <a
                href={`tel:${siteConfig.phone.tel}`}
                className="flex items-center gap-2 transition hover:text-white"
              >
                <Phone className="h-4 w-4 text-primary" />
                {siteConfig.phone.short}
              </a>
            </li>
            <li>
              <a
                href={`mailto:${siteConfig.email.general}`}
                className="flex items-center gap-2 transition hover:text-white"
              >
                <Mail className="h-4 w-4 text-primary" />
                {siteConfig.email.general}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-white">
            Follow Us
          </h3>
          <div className="flex flex-col gap-2">
            {socialLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-primary"
              >
                <ExternalLink className="h-4 w-4" />
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 bg-[#1a1a1a] py-6 text-center text-sm text-white/45">
        Copyright {siteConfig.foundedYear} © <strong className="text-white/70">{siteConfig.name}</strong>
      </div>
    </footer>
  );
}
