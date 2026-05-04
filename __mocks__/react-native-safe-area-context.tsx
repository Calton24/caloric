import React from "react";

export const SafeAreaInsetsContext = React.createContext({
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
});

export function SafeAreaProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return <>{children}</>;
}

export function useSafeAreaInsets(): {
  top: number;
  bottom: number;
  left: number;
  right: number;
} {
  return { top: 0, bottom: 0, left: 0, right: 0 };
}

export function useSafeAreaFrame(): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  return { x: 0, y: 0, width: 390, height: 844 };
}
