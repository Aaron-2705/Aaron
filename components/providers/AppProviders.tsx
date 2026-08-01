"use client";

import { MotionConfig } from "framer-motion";

import { ActiveModuleProvider } from "@/components/providers/ActiveModuleProvider";
import { BootProvider } from "@/components/providers/BootProvider";
import { LoadingProvider } from "@/components/providers/LoadingProvider";
import { SmoothScrollProvider } from "@/components/providers/SmoothScrollProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LoadingProvider>
        <BootProvider>
          {/* reducedMotion="user" makes framer honor the OS setting internally
              and identically on server + client, so entrance components render
              the same markup either way (no hydration mismatch). */}
          <MotionConfig reducedMotion="user">
            <ActiveModuleProvider>
              <SmoothScrollProvider>{children}</SmoothScrollProvider>
            </ActiveModuleProvider>
          </MotionConfig>
        </BootProvider>
      </LoadingProvider>
    </ThemeProvider>
  );
}
