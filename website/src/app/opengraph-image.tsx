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

const servicesLine =
  "Security  ·  Cameras  ·  Networking  ·  Audio and Video  ·  Starlink";

async function loadLatoFonts() {
  const [bold, regular] = await Promise.all([
    fetch(
      "https://fonts.gstatic.com/s/lato/v24/S6u9w4BMUTPHh6UVSwiPHA.ttf",
    ).then((res) => res.arrayBuffer()),
    fetch(
      "https://fonts.gstatic.com/s/lato/v24/S6uyw4BMUTPHjx4wWw.ttf",
    ).then((res) => res.arrayBuffer()),
  ]);

  return [
    { name: "Lato", data: bold, weight: 700 as const, style: "normal" as const },
    { name: "Lato", data: regular, weight: 400 as const, style: "normal" as const },
  ];
}

export default async function Image() {
  const [logoData, fonts] = await Promise.all([
    readFile(join(process.cwd(), "public/images/shield-logo.png")),
    loadLatoFonts(),
  ]);

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
          fontFamily: "Lato",
        }}
      >
        {/* Site header accent */}
        <div style={{ display: "flex", width: "100%", height: 14, background: "#660000" }} />

        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "40px 52px 36px 52px",
          }}
        >
          {/* Hero row — large shield + wordmark */}
          <div style={{ display: "flex", alignItems: "center", gap: 44 }}>
            <img
              src={logoSrc}
              alt=""
              width={300}
              height={300}
              style={{ objectFit: "contain", flexShrink: 0 }}
            />

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                flex: 1,
              }}
            >
              <div
                style={{
                  fontSize: 78,
                  fontWeight: 700,
                  color: "#ffffff",
                  lineHeight: 1,
                  letterSpacing: "-0.025em",
                }}
              >
                McKee Security
              </div>
              <div
                style={{
                  fontSize: 58,
                  fontWeight: 700,
                  color: "#ffffff",
                  lineHeight: 1.05,
                  letterSpacing: "-0.02em",
                }}
              >
                Audio Systems
              </div>

              <div
                style={{
                  display: "flex",
                  width: 120,
                  height: 4,
                  background: "#c91818",
                  marginTop: 14,
                  marginBottom: 10,
                }}
              />

              <div
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  color: "#c91818",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                }}
              >
                Specialists Since 1994
              </div>
            </div>
          </div>

          {/* Services + location */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div
              style={{
                fontSize: 38,
                fontWeight: 700,
                color: "#ffffff",
                lineHeight: 1.3,
              }}
            >
              {servicesLine}
            </div>
            <div
              style={{
                fontSize: 30,
                fontWeight: 400,
                color: "rgba(255,255,255,0.72)",
                lineHeight: 1.3,
              }}
            >
              Homes and businesses in Haliburton, Ontario
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "3px solid rgba(201,24,24,0.45)",
              paddingTop: 20,
            }}
          >
            <div
              style={{
                fontSize: 30,
                fontWeight: 700,
                color: "#ffffff",
                letterSpacing: "0.04em",
              }}
            >
              mckeesecurity.ca
            </div>
            <div
              style={{
                fontSize: 30,
                fontWeight: 700,
                color: "rgba(255,255,255,0.75)",
              }}
            >
              {siteConfig.phone.short}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
