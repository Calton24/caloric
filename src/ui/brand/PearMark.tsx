/**
 * PearMark — Minimal inverted pear logomark for CalCut brand lockup.
 *
 * A simple, geometric pear silhouette designed to read cleanly at small sizes
 * (14–20 px). Single-color fill, no stroke, no gradients. Works as a white
 * mark over dark surfaces and can be tinted via the `color` prop.
 */

import React from "react";
import Svg, { Path } from "react-native-svg";

interface PearMarkProps {
  size?: number;
  color?: string;
}

export function PearMark({ size = 18, color = "#fff" }: PearMarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Stem + leaf */}
      <Path
        d="M12 1.5c0 2.5-1.2 3.8-1.2 3.8"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M12 3.2c1.4-.8 3-.4 3.2.3.2.7-.8 1.6-2.2 1.8"
        fill={color}
        opacity={0.85}
      />
      {/* Pear body — a single smooth shape */}
      <Path
        d="M12 7c-2.8 0-5.2 1.6-6 4.2-.6 2 .1 4.2 1.4 5.8C8.8 18.8 10.2 22 12 22s3.2-3.2 4.6-5c1.3-1.6 2-3.8 1.4-5.8C17.2 8.6 14.8 7 12 7Z"
        fill={color}
      />
    </Svg>
  );
}
