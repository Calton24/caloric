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
    // Warm off-white base — never pure #FFF.
    // Gives card separation without borders.
    return [
      "#F4F5F7", // 0 - background (soft warm grey)
      "#ECEDEF", // 1 - primary surface
      "#E4E5E9", // 2 - secondary surface
      "#D8DAE0", // 3 - borders
      "#CDD0D8", // 4 - heavier borders
      "#B0B5BF", // 5 - muted elements
      "#8A909C", // 6 - secondary text
      "#667085", // 7 - body text
      "#3D4350", // 8 - strong text
      "#1B1F27", // 9 - heading text
    ];
  } else {
    // Premium charcoal — never pure #000.
    // Lets glass surfaces read and keeps green accent refined.
    return [
      "#0F1318", // 0 - background (charcoal)
      "#171C22", // 1 - primary surface
      "#1E2430", // 2 - elevated surface
      "#283040", // 3 - lighter elevation
      "#364050", // 4 - mid-tone
      "#4D5768", // 5 - accent gray
      "#6B7589", // 6 - muted text
      "#AAB3C2", // 7 - secondary text
      "#D0D5DE", // 8 - light text
      "#F3F5F7", // 9 - heading text
    ];
  }
}

/**
 * Generate semantic status colors
 */
function generateStatusColors(mode: ColorMode) {
  if (mode === "light") {
    // WCAG AA compliant on white (#FFF) — all ≥ 4.5:1
    return {
      success: "#047857", // Emerald-700, ~5.7:1
      warning: "#B45309", // Amber-700, ~5.1:1
      error: "#DC2626", // Red-600, ~4.6:1
      info: "#2563EB", // Blue-600, ~5.2:1
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

      // Text — WCAG AA compliant on white
      text: neutrals[9], // #212529, ~15.4:1 ✓
      textSecondary: "#4B5563", // ~7.6:1 ✓ (was #868E96 at 3.5:1)
      textMuted: "#6B7280", // ~4.9:1 ✓ (was #ADB5BD at 2.1:1)
      textInverse: "#FFFFFF",

      // Interactive — darkened for AA contrast on background
      primary: brandScale[7], // L=30, ~5:1 ✓ (was [5] L=50 at 1.9:1)
      primaryPressed: brandScale[8], // L=20
      secondary: brandScale[3], // L=70, decorative fills
      accent: brandScale[5], // L=50

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

      // Glass Effects — elevated surfaces with rich translucency
      glassBackground: "rgba(255, 255, 255, 0.65)",
      glassBorder: "rgba(255, 255, 255, 0.25)",
      glassTint: neutrals[2],

      // Glass Widget Kit
      glassTintLight: "rgba(255, 255, 255, 0.15)",
      glassTintDark: "rgba(0, 0, 0, 0.04)",
      glassBorderHighlight: "rgba(255, 255, 255, 0.80)",
      glassShadow: "rgba(0, 0, 0, 0.06)",
      glassActiveRing: brandScale[7],

      // Premium Surfaces
      surfaceMatte: "#ECEDEF",
      glassSelected: brandScale[1] + "55", // tinted green glass
      glassSelectedBorder: brandScale[5] + "40",
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

      // Glass Effects — subtle translucency on charcoal
      glassBackground: "rgba(20, 25, 30, 0.60)",
      glassBorder: "rgba(255, 255, 255, 0.12)",
      glassTint: neutrals[1],

      // Glass Widget Kit
      glassTintLight: "rgba(255, 255, 255, 0.06)",
      glassTintDark: "rgba(0, 0, 0, 0.25)",
      glassBorderHighlight: "rgba(255, 255, 255, 0.18)",
      glassShadow: "rgba(0, 0, 0, 0.50)",
      glassActiveRing: brandScale[4],

      // Premium Surfaces
      surfaceMatte: "#171C22",
      glassSelected: brandScale[6] + "30", // tinted green glass
      glassSelectedBorder: brandScale[4] + "50",
    };
  }
}
