/**
 * Layered shadow so hero copy stays legible over busy photos without backdrop
 * boxes. Tuned for legibility-per-cost: the tight inner layers do the heavy
 * lifting for edge contrast, with a modest soft halo for separation. The huge
 * (100px+) blur layers were dropped because they cost the most to rasterize
 * while adding almost no perceptible legibility.
 */
export const heroCopyShadow =
  "[text-shadow:0_1px_2px_rgb(0_0_0/1),0_2px_6px_rgb(0_0_0/0.9),0_3px_16px_rgb(0_0_0/0.72),0_6px_34px_rgb(0_0_0/0.5)]";

export const heroCtaShadow = "shadow-[0_4px_24px_rgb(0_0_0/0.6)]";

/**
 * Release the compositor layer hint once the hero entrance finishes so we don't
 * keep `will-change` promoted for the lifetime of the page.
 */
export function clearWillChangeOnEnd(
  event: import("react").AnimationEvent<HTMLElement>,
) {
  event.currentTarget.style.willChange = "auto";
}
