import { heritageBlurb, siteConfig } from "@/lib/site-config";
import { FadeIn } from "@/components/motion/fade-in";
import { InquiryForm } from "@/components/forms/inquiry-form";

type CtaBandProps = {
  title?: string;
  subtitle?: string;
  serviceLabel?: string;
};

export function CtaBand({
  title = "Ready to protect what matters most?",
  subtitle = "Contact us for a free consultation and custom quote.",
  serviceLabel,
}: CtaBandProps) {
  return (
    <section className="relative overflow-hidden py-20">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-secondary/10" />
      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <FadeIn>
          <h2 className="text-3xl font-bold text-white sm:text-4xl">{title}</h2>
          <p className="mt-4 text-lg text-white/65">{subtitle}</p>
          <div className="mt-8 flex flex-col items-center gap-4">
            <InquiryForm serviceLabel={serviceLabel} />
            <p className="text-sm text-white/50">
              {siteConfig.phone.short} · {siteConfig.email.general}
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

export function HeritageBand() {
  return (
    <section className="border-y border-white/5 bg-surface py-16">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <FadeIn>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">
            Three Generations of Excellence
          </p>
          <p className="mt-4 text-lg leading-relaxed text-white/70">
            {heritageBlurb}
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
