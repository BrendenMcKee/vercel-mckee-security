import Image from "next/image";

/** Shared photo + gradient backdrop used on the homepage stats and reviews bands */
export function BrandedStatsBackground() {
  return (
    <div className="pointer-events-none absolute -inset-x-0 -top-8 bottom-0">
      <Image
        src="/images/stats-bg.jpg"
        alt=""
        fill
        className="object-cover object-[50%_80%]"
        sizes="100vw"
        quality={85}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/40 via-[#660000]/55 to-[#0a0a0a]" />
      <div className="absolute inset-0 bg-black/45" />
    </div>
  );
}
