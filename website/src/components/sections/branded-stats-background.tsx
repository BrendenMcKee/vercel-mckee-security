import Image from "next/image";

/** Shared photo + gradient backdrop used on the homepage stats and reviews bands */
export function BrandedStatsBackground() {
  return (
    <>
      <Image
        src="/images/stats-bg.jpg"
        alt=""
        fill
        className="object-cover object-center"
        sizes="100vw"
        quality={85}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#660000]/55 to-[#0a0a0a]" />
      <div className="absolute inset-0 bg-black/45" />
    </>
  );
}
