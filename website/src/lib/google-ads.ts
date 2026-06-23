/** Google Ads conversion ID for mckeesecurity.ca */
export const GOOGLE_ADS_ID = "AW-18266278950";

/** Set via env when conversion actions are created in Google Ads. */
const CONVERSION_LABELS = {
  contact:
    process.env.NEXT_PUBLIC_GOOGLE_ADS_CONTACT_LABEL?.trim() || "",
  quote: process.env.NEXT_PUBLIC_GOOGLE_ADS_QUOTE_LABEL?.trim() || "",
} as const;

export type GoogleAdsConversion = keyof typeof CONVERSION_LABELS;

function getSendTo(conversion: GoogleAdsConversion): string | null {
  const label = CONVERSION_LABELS[conversion];
  if (!label) return null;
  return `${GOOGLE_ADS_ID}/${label}`;
}

/** Fire a Google Ads conversion after a successful form submit. */
export function trackGoogleAdsConversion(conversion: GoogleAdsConversion): void {
  if (typeof window === "undefined") return;

  const sendTo = getSendTo(conversion);
  if (!sendTo) return;

  const gtag = (
    window as Window & { gtag?: (...args: unknown[]) => void }
  ).gtag;
  if (typeof gtag !== "function") return;

  gtag("event", "conversion", { send_to: sendTo });
}
