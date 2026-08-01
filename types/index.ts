export type ThemeName =
  | "cyber"
  | "ironman"
  | "matrix"
  | "stealth"
  | "jarvis"
  | "arc"
  | "steel";

export interface ThemeContextValue {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

export type BootPhase = "idle" | "booting" | "complete";

export interface BootContextValue {
  phase: BootPhase;
  setPhase: (phase: BootPhase) => void;
  skip: () => void;
}

export interface LoadingContextValue {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}
