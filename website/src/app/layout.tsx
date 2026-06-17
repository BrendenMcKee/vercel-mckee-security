import type { Metadata } from "next";
import { Lato, Dancing_Script } from "next/font/google";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { siteConfig } from "@/lib/site-config";
import "./globals.css";

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${lato.variable} ${dancing.variable} h-full`}>
      <body className="flex min-h-full flex-col antialiased">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
