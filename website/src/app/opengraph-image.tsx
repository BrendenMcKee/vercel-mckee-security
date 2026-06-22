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
  "Security  ·  Cameras  ·  Networking  ·  Audio & Video  ·  Starlink";

/** Both wordmark crops share this width so they scale 1:1 and stay aligned. */
const WORDMARK_WIDTH = 720;
const TITLE_ASPECT = 360 / 2740;
const SUBLINE_ASPECT = 451 / 2740;

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
  const [shieldData, titleData, sublineData, fonts] = await Promise.all([
    readFile(join(process.cwd(), "public/images/shield-logo.png")),
    readFile(join(process.cwd(), "public/images/og-logo-title.png")),
    readFile(join(process.cwd(), "public/images/og-logo-subline.png")),
    loadLatoFonts(),
  ]);

  const toSrc = (data: Buffer) =>
    `data:image/png;base64,${data.toString("base64")}`;

  const titleDisplayHeight = Math.round(WORDMARK_WIDTH * TITLE_ASPECT);
  const sublineDisplayHeight = Math.round(WORDMARK_WIDTH * SUBLINE_ASPECT);

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
        <div style={{ display: "flex", width: "100%", height: 14, background: "#660000" }} />

        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "36px 48px 32px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
            <img
              src={toSrc(shieldData)}
              alt=""
              width={280}
              height={280}
              style={{ objectFit: "contain", flexShrink: 0 }}
            />

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
              }}
            >
              {/* Stacked logo.png crops — same width keeps serif wordmark aligned */}
              <img
                src={toSrc(titleData)}
                alt=""
                width={WORDMARK_WIDTH}
                height={titleDisplayHeight}
                style={{ display: "flex", objectFit: "contain", objectPosition: "left top" }}
              />
              <img
                src={toSrc(sublineData)}
                alt=""
                width={WORDMARK_WIDTH}
                height={sublineDisplayHeight}
                style={{
                  display: "flex",
                  objectFit: "contain",
                  objectPosition: "left top",
                  marginTop: -2,
                }}
              />

              <div
                style={{
                  display: "flex",
                  width: WORDMARK_WIDTH,
                  justifyContent: "center",
                  marginTop: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 24,
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
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div
              style={{
                fontSize: 36,
                fontWeight: 700,
                color: "#ffffff",
                lineHeight: 1.3,
              }}
            >
              {servicesLine}
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 400,
                color: "rgba(255,255,255,0.72)",
                lineHeight: 1.3,
              }}
            >
              Homes and businesses in Haliburton, Ontario
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "3px solid rgba(201,24,24,0.45)",
              paddingTop: 18,
            }}
          >
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "#ffffff",
                letterSpacing: "0.04em",
              }}
            >
              mckeesecurity.ca
            </div>
            <div
              style={{
                fontSize: 28,
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
