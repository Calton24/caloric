/**
 * Color Palette Generator
 * Generates a complete color palette from a brand hue.
 */

import { ThemeTokens } from "./tokens";

export type ColorMode = "light" | "dark";

/**
 * Convert HSL to hex color
 */
function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Generate a color scale from a hue
 */
function generateColorScale(hue: number, saturation: number): string[] {
  const lightnesses = [95, 90, 80, 70, 60, 50, 40, 30, 20, 10];
  return lightnesses.map((l) => hslToHex(hue, saturation, l));
}

/**
 * Generate neutral grayscale
 */
function generateNeutrals(mode: ColorMode): string[] {
  if (mode === "light") {
    return [
      "#FFFFFF", // 0
      "#F8F9FA", // 1
      "#F1F3F5", // 2
      "#E9ECEF", // 3
      "#DEE2E6", // 4
      "#CED4DA", // 5
      "#ADB5BD", // 6
      "#868E96", // 7
      "#495057", // 8
      "#212529", // 9
    ];
  } else {
    return [
      "#0A0A0A", // 0
      "#121212", // 1
      "#1E1E1E", // 2
      "#2A2A2A", // 3
      "#383838", // 4
      "#4A4A4A", // 5
      "#6B6B6B", // 6
      "#909090", // 7
      "#B8B8B8", // 8
      "#E5E5E5", // 9
    ];
  }
}

/**
 * Generate semantic status colors
 */
function generateStatusColors(mode: ColorMode) {
  if (mode === "light") {
    return {
      success: "#10B981",
      warning: "#F59E0B",
      error: "#EF4444",
      info: "#3B82F6",
    };
  } else {
    return {
      success: "#34D399",
      warning: "#FBBF24",
      error: "#F87171",
      info: "#60A5FA",
    };
  }
}

/**
 * Generate complete theme palette from brand hue
 */
export function generatePalette(
  brandHue: number,
  mode: ColorMode
): ThemeTokens {
  const brandScale = generateColorScale(brandHue, 70);
  const neutrals = generateNeutrals(mode);
  const status = generateStatusColors(mode);

  if (mode === "light") {
    return {
      // Backgrounds
      background: neutrals[0],
      backgroundSecondary: neutrals[1],
      backgroundTertiary: neutrals[2],

      // Surfaces
      surface: neutrals[0],
      surfaceSecondary: neutrals[1],
      surfaceElevated: neutrals[0],

      // Text
      text: neutrals[9],
      textSecondary: neutrals[7],
      textMuted: neutrals[6],
      textInverse: neutrals[0],

      // Interactive
      primary: brandScale[5],
      primaryPressed: brandScale[6],
      secondary: brandScale[3],
      accent: brandScale[4],

      // Status
      success: status.success,
      warning: status.warning,
      error: status.error,
      info: status.info,

      // Borders & Dividers
      border: neutrals[3],
      borderSecondary: neutrals[2],
      divider: neutrals[3],

      // Overlays
      overlay: "rgba(0, 0, 0, 0.3)",
      overlayHeavy: "rgba(0, 0, 0, 0.6)",

      // Glass Effects
      glassBackground: "rgba(255, 255, 255, 0.7)",
      glassBorder: "rgba(255, 255, 255, 0.3)",
      glassTint: neutrals[0],
    };
  } else {
    return {
      // Backgrounds
      background: neutrals[0],
      backgroundSecondary: neutrals[1],
      backgroundTertiary: neutrals[2],

      // Surfaces
      surface: neutrals[1],
      surfaceSecondary: neutrals[2],
      surfaceElevated: neutrals[3],

      // Text
      text: neutrals[9],
      textSecondary: neutrals[7],
      textMuted: neutrals[6],
      textInverse: neutrals[0],

      // Interactive
      primary: brandScale[4],
      primaryPressed: brandScale[3],
      secondary: brandScale[6],
      accent: brandScale[5],

      // Status
      success: status.success,
      warning: status.warning,
      error: status.error,
      info: status.info,

      // Borders & Dividers
      border: neutrals[4],
      borderSecondary: neutrals[3],
      divider: neutrals[4],

      // Overlays
      overlay: "rgba(0, 0, 0, 0.5)",
      overlayHeavy: "rgba(0, 0, 0, 0.8)",

      // Glass Effects
      glassBackground: "rgba(30, 30, 30, 0.7)",
      glassBorder: "rgba(255, 255, 255, 0.1)",
      glassTint: neutrals[1],
    };
  }
}
