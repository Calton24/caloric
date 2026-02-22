/**
 * Mobile Core UI - Main Entry Point
 * Export all components, hooks, and utilities
 */

// === PROVIDERS ===
export { AuthProvider } from "./features/auth/AuthProvider";
export { MobileCoreProviders } from "./MobileCoreProviders";
export { ThemeProvider } from "./theme/ThemeProvider";
export { BottomSheetProvider } from "./ui/sheets/BottomSheetProvider";

// === HOOKS ===
export { useAuth } from "./features/auth/useAuth";
export { useTheme } from "./theme/useTheme";
export { useSubmitLock } from "./ui/forms/useSubmitLock";
export { useBottomSheet } from "./ui/sheets/useBottomSheet";

// === THEME ===
export { generatePalette } from "./theme/colors";
export type { ColorMode } from "./theme/colors";
export type { Theme, ThemeContextValue } from "./theme/ThemeProvider";
export { radius, shadows, spacing, typography } from "./theme/tokens";
export type {
    RadiusTokens,
    SpacingTokens,
    ThemeTokens,
    TypographyTokens
} from "./theme/tokens";

// === GLASS COMPONENTS ===
export { GlassCard } from "./ui/glass/GlassCard";
export { GlassSurface } from "./ui/glass/GlassSurface";

// === TAB COMPONENTS ===
export { GlassTabBar } from "./ui/tabs/GlassTabBar";

// === PRIMITIVES ===
export { ColorPickerSheet } from "./ui/primitives/ColorPickerSheet";
export { HueSlider } from "./ui/primitives/HueSlider";
export { TButton } from "./ui/primitives/TButton";
export type { TButtonProps } from "./ui/primitives/TButton";
export { TDivider } from "./ui/primitives/TDivider";
export type { TDividerProps } from "./ui/primitives/TDivider";
export { TInput } from "./ui/primitives/TInput";
export type { TInputProps } from "./ui/primitives/TInput";
export { TSpacer } from "./ui/primitives/TSpacer";
export type { TSpacerProps } from "./ui/primitives/TSpacer";
export { TText } from "./ui/primitives/TText";
export type { TTextProps } from "./ui/primitives/TText";

// === LAYOUT ===
export { Screen } from "./ui/layout/Screen";
export type { ScreenProps } from "./ui/layout/Screen";

// === FORMS ===
export { FormField } from "./ui/forms/FormField";
export type { FormFieldProps } from "./ui/forms/FormField";

// === AUTH ===
export { authClient, createAuthClient } from "./features/auth/authClient";
export type {
    AuthClient,
    AuthProviderType,
    OAuthProvider,
    OAuthResponse,
    Session,
    User
} from "./features/auth/authClient";

// === DEV UTILITIES ===
export { DevOnly } from "./ui/dev/DevOnly";
