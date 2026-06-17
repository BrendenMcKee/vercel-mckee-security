import type { Metadata } from "next";
import Script from "next/script";
import { Lato, Dancing_Script } from "next/font/google";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { siteConfig } from "@/lib/site-config";
import "./globals.css";
import "@/styles/elementor-forms.css";
import "@/styles/elementor-cards.css";

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const dancing = Dancing_Script({
  variable: "--font-dancing",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
  openGraph: {
    type: "website",
    locale: "en_CA",
    siteName: siteConfig.name,
  },
  icons: {
    icon: "/images/favicon-192.png",
    apple: "/images/favicon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${lato.variable} ${dancing.variable} h-full`}>
      <head>
        <Script id="header-scroll-sync" strategy="beforeInteractive">
          {`(function(){function syncHeaderScroll(){var y=window.scrollY||document.documentElement.scrollTop||0;document.documentElement.classList.toggle("header-scrolled",y>56);}syncHeaderScroll();window.addEventListener("load",syncHeaderScroll);window.addEventListener("pageshow",syncHeaderScroll);})();`}
        </Script>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
          integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </head>
      <body className="flex min-h-full flex-col antialiased">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
