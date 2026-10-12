import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";
import { BRAND } from "@/config/brand";
import { GmButton } from "@/components/gm-button";
import { Header } from "@/components/header";
import { Providers } from "@/components/providers";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

const SITE = "https://dex.aibusiness.fun";
const TITLE = `${BRAND} — Robinhood Chain DEX for swaps and NFTs`;
const DESCRIPTION =
  "Swap ETH, USDG, and Robinhood stock tokens. Trade Rare Friends and verified NFTs, open Uniswap v3 pools, and read the wallet bag.";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: TITLE,
    template: `%s · ${BRAND}`,
  },
  description: DESCRIPTION,
  applicationName: BRAND,
  keywords: [
    BRAND,
    "Robinhood Chain",
    "Uniswap v3",
    "Rare Friends",
    "stock tokens",
    "USDG",
    "NFT",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE,
    siteName: BRAND,
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_US",
    images: [{ url: "/card/home", width: 1200, height: 630, alt: TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@bihary41418",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/card/home"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  category: "finance",
};

export const viewport: Viewport = {
  themeColor: "#090b08",
  colorScheme: "dark",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: BRAND,
  url: SITE,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  description: DESCRIPTION,
  image: `${SITE}/card/home`,
  sameAs: [
    "https://x.com/bihary41418",
    "https://farcaster.xyz/~/channel/auraos",
    "https://github.com/Laszlo23/dexxxx",
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <link rel="preconnect" href="https://rpc.mainnet.chain.robinhood.com" />
        <link rel="dns-prefetch" href="https://rpc.mainnet.chain.robinhood.com" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <Providers>
          <Suspense fallback={<div className="h-16 border-b border-line" />}>
            <Header />
          </Suspense>
          <main className="flex-1">{children}</main>
          <SiteFooter />
          <GmButton />
          <Script src="https://doghood.aibusiness.fun/floor/street.js?v=14" strategy="afterInteractive" />
        </Providers>
      </body>
    </html>
  );
}
