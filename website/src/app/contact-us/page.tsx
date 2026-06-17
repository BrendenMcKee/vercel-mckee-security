import type { Metadata } from "next";
import { MapPin, Phone, Mail } from "lucide-react";
import { Hero } from "@/components/sections/hero";
import { ContactForm } from "@/components/forms/contact-form";
import { FadeIn } from "@/components/motion/fade-in";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with McKee Security and Audio Systems in Haliburton, Ontario.",
};

export default function ContactPage() {
  return (
    <>
      <Hero
        eyebrow="Get in touch"
        title="We would love to hear from you"
        subtitle="Call us for sales and support, or send a message using the form below."
        compact
      />

      <section className="py-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-2">
          <FadeIn>
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-white">Talk to sales</h2>
                <p className="mt-2 text-white/60">
                  Issues with your products or services? We are here to help.
                </p>
                <a
                  href={`tel:${siteConfig.phone.tel}`}
                  className="mt-4 inline-flex items-center gap-2 text-2xl font-bold text-primary"
                >
                  <Phone className="h-6 w-6" />
                  1-705-457-2156
                </a>
              </div>

              <div className="rounded-2xl border border-white/10 bg-surface-elevated/40 p-6">
                <h3 className="flex items-center gap-2 font-bold text-white">
                  <MapPin className="h-5 w-5 text-primary" />
                  Location
                </h3>
                <p className="mt-2 text-white/60">{siteConfig.address.full}</p>
              </div>

              <div>
                <h3 className="font-bold text-white">Direct contacts</h3>
                <ul className="mt-4 space-y-4">
                  {siteConfig.email.contacts.map((c) => (
                    <li key={c.email} className="border-b border-white/5 pb-4 last:border-0">
                      <p className="font-semibold text-white">{c.name}</p>
                      <p className="text-sm text-white/50">{c.title}</p>
                      <a
                        href={`mailto:${c.email}`}
                        className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        <Mail className="h-3 w-3" />
                        {c.email}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </FadeIn>

          <ContactForm />
        </div>
      </section>
    </>
  );
}
