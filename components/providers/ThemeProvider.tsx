"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

import type { ThemeContextValue, ThemeName } from "@/types";

const STORAGE_KEY = "aaron-theme";
/**
 * MUST match the `data-theme` rendered by `app/layout.tsx`. When these two
 * disagreed ("steel" server-side, "cyber" here), every visitor with no stored
 * preference saw the site paint in steel and then flip to neon cyan the moment
 * this provider's effect ran.
 */
const DEFAULT_THEME: ThemeName = "steel";

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    if (typeof window === "undefined") return DEFAULT_THEME;
    return (window.localStorage.getItem(STORAGE_KEY) as ThemeName | null) ?? DEFAULT_THEME;
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const setTheme = useCallback((next: ThemeName) => {
    setThemeState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
