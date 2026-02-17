/**
 * Theme Storage
 * Persists theme preferences to AsyncStorage
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { ColorMode } from "./colors";

const THEME_MODE_KEY = "@mobile-core/theme-mode";
const BRAND_HUE_KEY = "@mobile-core/brand-hue";

export interface ThemePreferences {
  mode: ColorMode;
  brandHue: number;
}

export const themeStorage = {
  async getMode(): Promise<ColorMode | null> {
    try {
      const mode = await AsyncStorage.getItem(THEME_MODE_KEY);
      return mode as ColorMode | null;
    } catch (error) {
      if (__DEV__) {
        console.error("Failed to load theme mode:", error);
      }
      return null;
    }
  },

  async setMode(mode: ColorMode): Promise<void> {
    try {
      await AsyncStorage.setItem(THEME_MODE_KEY, mode);
    } catch (error) {
      if (__DEV__) {
        console.error("Failed to save theme mode:", error);
      }
    }
  },

  async getBrandHue(): Promise<number | null> {
    try {
      const hue = await AsyncStorage.getItem(BRAND_HUE_KEY);
      return hue ? parseInt(hue, 10) : null;
    } catch (error) {
      if (__DEV__) {
        console.error("Failed to load brand hue:", error);
      }
      return null;
    }
  },

  async setBrandHue(hue: number): Promise<void> {
    try {
      await AsyncStorage.setItem(BRAND_HUE_KEY, hue.toString());
    } catch (error) {
      if (__DEV__) {
        console.error("Failed to save brand hue:", error);
      }
    }
  },

  async getPreferences(): Promise<ThemePreferences> {
    const [mode, brandHue] = await Promise.all([
      this.getMode(),
      this.getBrandHue(),
    ]);

    return {
      mode: mode || "light",
      brandHue: brandHue || 220, // Default to blue
    };
  },

  async setPreferences(preferences: ThemePreferences): Promise<void> {
    await Promise.all([
      this.setMode(preferences.mode),
      this.setBrandHue(preferences.brandHue),
    ]);
  },
};
