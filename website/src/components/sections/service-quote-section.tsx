import { ServiceQuoteForm } from "@/components/forms/service-quote-form";
import { StarlinkRentalForm } from "@/components/forms/starlink-rental-form";
import { cn } from "@/lib/utils";

type ServiceQuoteSectionProps = {
  title: string;
  description: string;
  serviceLabel?: string;
  serviceSlug?: string;
  id?: string;
  className?: string;
};

export function ServiceQuoteSection({
  title,
  description,
  serviceLabel,
  serviceSlug,
  id = "quote",
  className,
}: ServiceQuoteSectionProps) {
  return (
    <section id={id} className={cn("mckee-service-quote-section", className)}>
      <div className="mckee-service-quote-container">
        <div className="mckee-service-quote-panel">
          <header className="mckee-service-quote-header">
            <h3>{title}</h3>
            <p>{description}</p>
          </header>
          <div className="mckee-service-quote-form-box">
            {serviceSlug === "starlink-rental" ? (
              <StarlinkRentalForm compact showHeader={false} />
            ) : (
              <ServiceQuoteForm
                compact
                serviceLabel={serviceLabel}
                serviceSlug={serviceSlug}
                showHeader={false}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
