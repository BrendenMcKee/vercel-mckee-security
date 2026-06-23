/** Google Ads conversion ID for mckeesecurity.ca */
export const GOOGLE_ADS_ID = "AW-18266278950";

/** Website lead form — Submit lead form / Website lead form */
export const GOOGLE_ADS_LEAD_LABEL =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL?.trim() ||
  "Ho69CPvZncQcEKaYhYZE";

const LEAD_SEND_TO = `${GOOGLE_ADS_ID}/${GOOGLE_ADS_LEAD_LABEL}`;

/** Fire after any successful customer lead form submit (contact or quote). */
export function trackWebsiteLeadForm(): void {
  if (typeof window === "undefined") return;

  const gtag = (
    window as Window & { gtag?: (...args: unknown[]) => void }
  ).gtag;
  if (typeof gtag !== "function") return;

  gtag("event", "conversion", { send_to: LEAD_SEND_TO });
}
