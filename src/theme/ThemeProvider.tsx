/**
 * Theme Provider
 * Provides theme context with color mode and brand customization
 */

import React, {
    createContext,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import { Appearance, useColorScheme } from "react-native";
import { haptics } from "../infrastructure/haptics";
import { ColorMode, generatePalette } from "./colors";
import { themeStorage } from "./storage";
import { ThemeTokens, radius, spacing, typography } from "./tokens";

export interface Theme {
  colors: ThemeTokens;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  mode: ColorMode;
  brandHue: number;
}

export interface ThemeContextValue {
  theme: Theme;
  setMode: (mode: ColorMode) => void;
  setBrandHue: (hue: number) => void;
  toggleMode: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(
  undefined
);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultMode?: ColorMode;
  defaultBrandHue?: number;
}

export function ThemeProvider({
  children,
  defaultMode,
  defaultBrandHue = 141,
}: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ColorMode>(defaultMode || "dark");
  const [brandHue, setBrandHueState] = useState<number>(defaultBrandHue);

  // Load persisted theme on mount (async, non-blocking)
  useEffect(() => {
    themeStorage.getPreferences().then((prefs) => {
      // Always enforce dark mode — ignore persisted mode
      setModeState("dark");
      if (prefs.brandHue !== undefined && prefs.brandHue !== null) {
        // Migrate old blue default (220) → new green default (141)
        const hue = prefs.brandHue === 220 ? defaultBrandHue : prefs.brandHue;
        setBrandHueState(hue);
      }
    });
  }, []);

  // Generate theme from current settings (memoized to prevent recreation)
  const theme: Theme = useMemo(
    () => ({
      colors: generatePalette(brandHue, mode),
      spacing,
      radius,
      typography,
      mode,
      brandHue,
    }),
    [brandHue, mode]
  );

  // Sync the native UIKit appearance to match the app's theme mode.
  // This ensures native components (e.g. liquid-glass tab bar) render
  // in the correct color scheme even when the device setting differs.
  useEffect(() => {
    Appearance.setColorScheme(mode);
  }, [mode]);

  const setMode = useCallback((newMode: ColorMode) => {
    setModeState(newMode);
    themeStorage.setMode(newMode);
  }, []);

  const setBrandHue = useCallback((hue: number) => {
    setBrandHueState(hue);
    themeStorage.setBrandHue(hue);
  }, []);

  const toggleMode = useCallback(() => {
    haptics.impact("medium");
    setMode(mode === "light" ? "dark" : "light");
  }, [mode, setMode]);

  const contextValue: ThemeContextValue = useMemo(
    () => ({
      theme,
      setMode,
      setBrandHue,
      toggleMode,
    }),
    [theme, setMode, setBrandHue, toggleMode]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}
