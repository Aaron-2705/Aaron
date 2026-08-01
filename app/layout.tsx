import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono, Inter, Orbitron } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

import { Navbar } from "@/components/layout/Navbar";
import { AppProviders } from "@/components/providers/AppProviders";
import { SITE } from "@/data/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["500", "700", "900"],
});

// Mercury hero: expressive variable serif display + calibrated body.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const clashDisplay = localFont({
  src: "./fonts/ClashDisplay-Variable.woff2",
  variable: "--font-clash",
  weight: "200 700",
  display: "swap",
});

export const viewport = {
  themeColor: "#050507",
};

/**
 * TODO (owner): replace with the real domain once one is registered, or set
 * NEXT_PUBLIC_SITE_URL at build time. metadataBase is what turns the relative
 * og:image into the absolute URL a crawler needs, so a wrong value here means
 * the social card silently fails to load even though the file exists. The
 * placeholder is a working Vercel-style host so nothing breaks before then.
 */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aaron-portfolio.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE.title,
  description: SITE.description,
  applicationName: SITE.name,
  authors: [{ name: SITE.owner, url: SITE.socials.linkedin }],
  creator: SITE.owner,
  keywords: [
    "cybersecurity portfolio",
    "IT support",
    "network support",
    "Windows Server",
    "Active Directory",
    "home lab",
    "Dhwanit Sukhadiya",
    "AARON",
  ],
  alternates: { canonical: "/" },
  // og:image and twitter:image are wired automatically from app/opengraph-image.png
  // and app/twitter-image.png; see scripts/build-brand-assets.py.
  openGraph: {
    title: SITE.title,
    description: SITE.description,
    type: "website",
    siteName: SITE.name,
    locale: "en_US",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.title,
    description: SITE.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="steel"
      className={`${geistSans.variable} ${geistMono.variable} ${orbitron.variable} ${clashDisplay.variable} ${fraunces.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <AppProviders>
          <Navbar />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
