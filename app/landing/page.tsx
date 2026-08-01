import type { Metadata } from "next";
import { Anton } from "next/font/google";

import { LandingHero } from "@/components/hero/LandingHero";

const heroDisplay = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-hero-display",
});

export const metadata: Metadata = {
  title: "Dhwanit Sukhadiya",
  description: "Security engineer — landing",
};

export default function LandingPage() {
  return (
    <div className={heroDisplay.variable}>
      <LandingHero />
    </div>
  );
}
