/**
 * Theme Storage
 * Persists theme preferences via the platform KeyValueStore abstraction.
 * Default backend: AsyncStorage. Swap via setStorage() for tests or MMKV.
 */

import { getStorage } from "../infrastructure/storage";
import { ColorMode } from "./colors";

const THEME_MODE_KEY = "@caloric/theme-mode";
const BRAND_HUE_KEY = "@caloric/brand-hue";

export interface ThemePreferences {
  mode: ColorMode;
  brandHue: number;
}

export const themeStorage = {
  async getMode(): Promise<ColorMode | null> {
    try {
      const mode = await getStorage().getItem(THEME_MODE_KEY);
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
      await getStorage().setItem(THEME_MODE_KEY, mode);
    } catch (error) {
      if (__DEV__) {
        console.error("Failed to save theme mode:", error);
      }
    }
  },

  async getBrandHue(): Promise<number | null> {
    try {
      const hue = await getStorage().getItem(BRAND_HUE_KEY);
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
      await getStorage().setItem(BRAND_HUE_KEY, hue.toString());
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
      brandHue: brandHue || 141, // Default to green
    };
  },

  async setPreferences(preferences: ThemePreferences): Promise<void> {
    await Promise.all([
      this.setMode(preferences.mode),
      this.setBrandHue(preferences.brandHue),
    ]);
  },
};
