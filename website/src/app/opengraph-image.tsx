import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { siteConfig } from "@/lib/site-config";

export const alt = `${siteConfig.name} — security, cameras, networking, audio/video, and Starlink in Haliburton, Ontario`;

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image() {
  const [logoData, heroData] = await Promise.all([
    readFile(join(process.cwd(), "public/images/shield-logo.png")),
    readFile(join(process.cwd(), "public/images/hero-apply-now.jpg")),
  ]);

  const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`;
  const heroSrc = `data:image/jpeg;base64,${heroData.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "#0a0a0a",
          fontFamily: "sans-serif",
        }}
      >
        {/* Photo backdrop (Apply Now bench — on-brand, local asset) */}
        <img
          src={heroSrc}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "18% 50%",
            opacity: 0.42,
          }}
        />

        {/* Dark + brand gradient overlay for readable copy */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(115deg, rgba(10,10,10,0.94) 0%, rgba(10,10,10,0.82) 42%, rgba(102,0,0,0.55) 100%)",
          }}
        />

        {/* Accent bar */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 8,
            background: "#c91818",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            padding: "56px 64px 52px 72px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <img
              src={logoSrc}
              alt=""
              width={120}
              height={120}
              style={{ objectFit: "contain" }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div
                style={{
                  fontSize: 46,
                  fontWeight: 700,
                  color: "#ffffff",
                  lineHeight: 1.1,
                  letterSpacing: "-0.02em",
                }}
              >
                McKee Security
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: "#1e99e6",
                  lineHeight: 1.2,
                }}
              >
                & Audio Systems
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div
              style={{
                fontSize: 34,
                fontWeight: 700,
                color: "#ffffff",
                lineHeight: 1.25,
                maxWidth: 920,
              }}
            >
              Custom security, cameras, networking, audio/video & Starlink
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 400,
                color: "rgba(255,255,255,0.78)",
                lineHeight: 1.35,
                maxWidth: 880,
              }}
            >
              Homes & businesses in Haliburton, Ontario · Since 1994
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              fontSize: 18,
              fontWeight: 700,
              color: "#c91818",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            <span>mckeesecurity.ca</span>
            <span style={{ color: "rgba(255,255,255,0.35)" }}>·</span>
            <span style={{ color: "rgba(255,255,255,0.65)" }}>
              {siteConfig.phone.short}
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
