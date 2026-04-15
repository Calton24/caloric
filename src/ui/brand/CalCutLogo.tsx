/**
 * CalCutLogo — Brand logomark using the monochrome pear asset.
 *
 * Uses the pre-rendered PNG silhouette for pixel-perfect rendering at small
 * sizes. The image is white on transparent, so `tintColor` can recolor it.
 *
 * Props:
 *   size  — width & height in dp (default 20)
 *   color — tint override (default "#fff")
 */

import React, { memo } from "react";
import { Image, StyleSheet } from "react-native";

const logoSource = require("../../../assets/images/logo/logo-monochrome.png");

interface CalCutLogoProps {
  size?: number;
  color?: string;
}

export const CalCutLogo = memo(function CalCutLogo({
  size = 20,
  color = "#fff",
}: CalCutLogoProps) {
  return (
    <Image
      source={logoSource}
      style={[styles.logo, { width: size, height: size, tintColor: color }]}
    />
  );
});

const styles = StyleSheet.create({
  logo: {
    resizeMode: "contain",
  },
});
