import { ServiceQuoteForm } from "@/components/forms/service-quote-form";
import { cn } from "@/lib/utils";

type ServiceQuoteSectionProps = {
  title: string;
  description: string;
  serviceLabel?: string;
  id?: string;
  className?: string;
};

export function ServiceQuoteSection({
  title,
  description,
  serviceLabel,
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
            <ServiceQuoteForm compact serviceLabel={serviceLabel} />
          </div>
        </div>
      </div>
    </section>
  );
}
