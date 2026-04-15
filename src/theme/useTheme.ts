/**
 * useTheme Hook
 * Access theme context in components
 */

import { useContext } from "react";
import { invariant } from "../utils/invariant";
import { ThemeContext, ThemeContextValue } from "./ThemeProvider";

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  invariant(
    context !== undefined,
    "useTheme must be used within a ThemeProvider. Did you forget to wrap your app with <CaloricProviders>?"
  );
  return context!;
}
