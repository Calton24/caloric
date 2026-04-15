/**
 * ColorPickerSheet
 * Simple color picker using Expo UI ColorPicker wheel
 */

import { ColorPicker, Host } from "@expo/ui/swift-ui";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "../../theme/useTheme";
import { TText } from "./TText";

/**
 * Convert hex color to hue (0-360°)
 */
function hexToHue(hex: string): number {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  if (delta === 0) return 0;

  let hue = 0;
  if (max === r) {
    hue = ((g - b) / delta) % 6;
  } else if (max === g) {
    hue = (b - r) / delta + 2;
  } else {
    hue = (r - g) / delta + 4;
  }

  hue = Math.round(hue * 60);
  if (hue < 0) hue += 360;

  return hue;
}

/**
 * Convert hue to hex color
 */
function hueToHex(hue: number): string {
  const h = hue / 60;
  const c = 1;
  const x = c * (1 - Math.abs((h % 2) - 1));

  let r = 0,
    g = 0,
    b = 0;

  if (h >= 0 && h < 1) {
    r = c;
    g = x;
  } else if (h >= 1 && h < 2) {
    r = x;
    g = c;
  } else if (h >= 2 && h < 3) {
    g = c;
    b = x;
  } else if (h >= 3 && h < 4) {
    g = x;
    b = c;
  } else if (h >= 4 && h < 5) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  const toHex = (n: number) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export function ColorPickerSheet() {
  const { theme, setBrandHue } = useTheme();
  const initialColor = hueToHex(theme.brandHue);
  const [selectedColor, setSelectedColor] = useState(initialColor);

  const handleColorChange = (value: any) => {
    try {
      let color: string;

      if (typeof value === "string") {
        color = value;
      } else if (value && typeof value === "object") {
        color = value.hex || value.color || value.value || "";
      } else {
        return;
      }

      // Strip alpha if present
      if (color.length === 9 && color.startsWith("#")) {
        color = color.substring(0, 7);
      }

      if (!color || !color.startsWith("#") || color.length !== 7) {
        return;
      }

      setSelectedColor(color);
      const hue = hexToHue(color);
      setBrandHue(Math.max(0, Math.min(360, hue)));
    } catch {
      // Silent fail
    }
  };

  return (
    <View style={styles.container}>
      <TText variant="subheading" style={styles.title}>
        Theme Color
      </TText>

      <View style={styles.smallSpacer} />

      <Host style={styles.pickerHost}>
        <ColorPicker
          selection={selectedColor}
          onSelectionChange={handleColorChange}
          supportsOpacity={false}
        />
      </Host>

      <View style={styles.smallSpacer} />

      <View style={styles.info}>
        <TText variant="body">{selectedColor}</TText>
        <TText variant="caption" color="secondary">
          {theme.brandHue}° Hue
        </TText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  title: {
    textAlign: "center",
  },
  pickerHost: {
    flex: 1,
    width: "100%",
    minHeight: 400,
  },
  info: {
    alignItems: "center",
    paddingTop: 8,
  },
  spacer: {
    height: 16,
  },
  smallSpacer: {
    height: 12,
  },
});
