/**
 * ThemeColorPickerSheet
 * Color picker sheet that updates theme brand hue in real-time
 * Uses Expo UI ColorPicker (same as Playground)
 */

import { ColorPicker } from "@expo/ui/swift-ui";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "../../theme/useTheme";
import { TText } from "./TText";

/**
 * Convert hex color to hue (0-360°)
 * @param hex - Hex color string (e.g. "#FF0000")
 * @returns Hue value in degrees (0-360)
 */
function hexToHue(hex: string): number {
  // Remove # if present
  const cleanHex = hex.replace("#", "");

  // Parse RGB
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  if (delta === 0) {
    return 0; // Achromatic (gray)
  }

  let hue = 0;

  if (max === r) {
    hue = ((g - b) / delta) % 6;
  } else if (max === g) {
    hue = (b - r) / delta + 2;
  } else {
    hue = (r - g) / delta + 4;
  }

  hue = Math.round(hue * 60);

  if (hue < 0) {
    hue += 360;
  }

  return hue;
}

/**
 * Convert hue to hex color (full saturation & brightness)
 * @param hue - Hue value in degrees (0-360)
 * @returns Hex color string
 */
function hueToHex(hue: number): string {
  const h = hue / 60;
  const c = 1; // Full saturation
  const x = c * (1 - Math.abs((h % 2) - 1));

  let r = 0,
    g = 0,
    b = 0;

  if (h >= 0 && h < 1) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 1 && h < 2) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 2 && h < 3) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 3 && h < 4) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 4 && h < 5) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  const toHex = (n: number) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export function ThemeColorPickerSheet() {
  const { theme, setBrandHue } = useTheme();
  const initialColor = hueToHex(theme.brandHue);
  const [selectedColor, setSelectedColor] = useState(initialColor);

  const handleColorChange = (value: any) => {
    try {
      // Defensive: handle any type ColorPicker might send
      let color: string;

      if (typeof value === "string") {
        color = value;
      } else if (value && typeof value === "object") {
        // Extract from object patterns: {hex: "..."}, {color: "..."}, {value: "..."}
        color = value.hex || value.color || value.value || "";
      } else {
        if (__DEV__) {
          console.warn(
            "[ColorPicker] Unexpected value type:",
            typeof value,
            value
          );
        }
        return;
      }

      // Strip alpha channel if present (#RRGGBBAA → #RRGGBB)
      if (color.length === 9 && color.startsWith("#")) {
        color = color.substring(0, 7);
      }

      // Validate hex format
      if (!color || !color.startsWith("#") || color.length !== 7) {
        if (__DEV__) {
          console.warn("[ColorPicker] Invalid hex format:", color);
        }
        return;
      }

      setSelectedColor(color);
      const hue = hexToHue(color);

      // Clamp hue to valid range
      const clampedHue = Math.max(0, Math.min(360, hue));
      setBrandHue(clampedHue);
    } catch (error) {
      if (__DEV__) {
        console.error("[ColorPicker] Error processing color:", error);
      }
    }
  };

  return (
    <View style={styles.container}>
      <TText variant="subheading" style={styles.title}>
        Primary Color
      </TText>

      {/* Color Preview */}
      <View style={styles.previewContainer}>
        <View
          style={[
            styles.colorPreview,
            {
              backgroundColor: selectedColor,
              borderColor: theme.colors.glassBorder,
            },
          ]}
        />
        <View style={styles.previewInfo}>
          <TText variant="body" color="primary">
            {selectedColor}
          </TText>
          <TText variant="caption" color="secondary">
            {theme.brandHue}° hue
          </TText>
        </View>
      </View>

      <ColorPicker
        selection={selectedColor}
        onValueChanged={handleColorChange}
        supportsOpacity={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    marginBottom: 16,
  },
  previewContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  colorPreview: {
    width: 60,
    height: 60,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  previewInfo: {
    flex: 1,
    gap: 4,
  },
});
