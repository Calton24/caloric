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
      "#000000", // 0 - pure black background
      "#1C1C1E", // 1 - dark gray surfaces  
      "#2C2C2E", // 2 - medium gray elevated surfaces
      "#3A3A3C", // 3 - lighter gray for higher elevation
      "#48484A", // 4 - mid-tone gray
      "#636366", // 5 - accent gray
      "#8E8E93", // 6 - light gray 
      "#AEAEB2", // 7 - lighter gray text
      "#C7C7CC", // 8 - very light gray
      "#F2F2F7", // 9 - near white
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
      glassBackground: "rgba(180, 184, 192, 0.55)",
      glassBorder: "rgba(0, 0, 0, 0.08)",
      glassTint: neutrals[2],

      // Glass Widget Kit
      glassTintLight: "rgba(140, 140, 148, 0.14)",
      glassTintDark: "rgba(0, 0, 0, 0.10)",
      glassBorderHighlight: "rgba(255, 255, 255, 0.60)",
      glassShadow: "rgba(0, 0, 0, 0.18)",
      glassActiveRing: brandScale[5],
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

      // Glass Widget Kit
      glassTintLight: "rgba(255, 255, 255, 0.12)",
      glassTintDark: "rgba(0, 0, 0, 0.25)",
      glassBorderHighlight: "rgba(255, 255, 255, 0.18)",
      glassShadow: "rgba(0, 0, 0, 0.35)",
      glassActiveRing: brandScale[4],
    };
  }
}
