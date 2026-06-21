import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { siteConfig } from "@/lib/site-config";

export const alt =
  "McKee Security and Audio Systems — security, cameras, networking, audio and video, and Starlink in Haliburton, Ontario";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

/** Avoid `&` in ImageResponse text — Satori can render it as literal &AMP; in some clients. */
const servicesLine =
  "Security  ·  Cameras  ·  Networking  ·  Audio and Video  ·  Starlink";

export default async function Image() {
  const logoData = await readFile(
    join(process.cwd(), "public/images/shield-logo.png"),
  );
  const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0a0a0a",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top brand bar — matches site header accent */}
        <div
          style={{
            display: "flex",
            width: "100%",
            height: 10,
            background: "#660000",
          }}
        />

        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "48px 56px 44px",
          }}
        >
          {/* Logo + wordmark row */}
          <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
            <img
              src={logoSrc}
              alt=""
              width={200}
              height={200}
              style={{ objectFit: "contain", flexShrink: 0 }}
            />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div
                style={{
                  fontSize: 58,
                  fontWeight: 700,
                  color: "#ffffff",
                  lineHeight: 1.05,
                  letterSpacing: "-0.02em",
                }}
              >
                McKee Security
              </div>
              <div
                style={{
                  fontSize: 40,
                  fontWeight: 700,
                  color: "#1e99e6",
                  lineHeight: 1.1,
                }}
              >
                Audio Systems
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#c91818",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                }}
              >
                Specialists since 1994
              </div>
            </div>
          </div>

          {/* Services + location */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              maxWidth: 980,
            }}
          >
            <div
              style={{
                fontSize: 30,
                fontWeight: 700,
                color: "#ffffff",
                lineHeight: 1.35,
              }}
            >
              {servicesLine}
            </div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 400,
                color: "rgba(255,255,255,0.72)",
                lineHeight: 1.35,
              }}
            >
              Homes and businesses in Haliburton, Ontario
            </div>
          </div>

          {/* Footer strip */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "2px solid rgba(255,255,255,0.12)",
              paddingTop: 22,
            }}
          >
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "#ffffff",
                letterSpacing: "0.06em",
              }}
            >
              mckeesecurity.ca
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "rgba(255,255,255,0.65)",
              }}
            >
              {siteConfig.phone.short}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
