/**
 * DevOnly
 * Wrapper component that only renders children in development mode
 * Prevents dev UI from leaking into production builds
 */

import React from "react";

interface DevOnlyProps {
  children: React.ReactNode;
}

/**
 * Renders children only in __DEV__ mode.
 * Use this to wrap any development-only UI components.
 */
export function DevOnly({ children }: DevOnlyProps) {
  if (__DEV__) {
    return <>{children}</>;
  }
  return null;
}
