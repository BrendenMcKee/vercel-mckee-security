import Image from "next/image";

/** Shared photo + gradient backdrop used on the homepage stats and reviews bands */
export function BrandedStatsBackground() {
  return (
    <div className="pointer-events-none absolute -inset-x-0 -top-8 bottom-0">
      <Image
        src="/images/services/work/starlink-snow-pole.jpg"
        alt=""
        fill
        className="object-cover object-[50%_50%]"
        sizes="100vw"
        quality={90}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-[#660000]/42 to-[#0a0a0a]" />
      <div className="absolute inset-0 bg-black/50" />
    </div>
  );
}
