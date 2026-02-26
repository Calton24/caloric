/**
 * SplashScreen
 * Configurable splash/loading screen with image and animation support.
 *
 * Features:
 * - Static image splash (logo / brand art)
 * - Animated entry: fade, scale, slide-up, or custom sequence
 * - Loading indicator (spinner or progress bar)
 * - Custom content slot for Lottie or any animated component
 * - Background color / gradient-fallback
 * - Auto-hide after delay or manual control via ref
 * - Ties into expo-splash-screen for native → JS handoff
 * - Token-driven via useTheme()
 */

import * as ExpoSplashScreen from "expo-splash-screen";
import React, {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useState,
} from "react";
import {
    ActivityIndicator,
    Image,
    ImageSourcePropType,
    StyleProp,
    StyleSheet,
    ViewStyle,
} from "react-native";
import Animated, {
    Easing,
    FadeIn,
    FadeOut,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withTiming,
} from "react-native-reanimated";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";

/* ── Types ─────────────────────────────────────────── */

export type SplashAnimation = "fade" | "scale" | "slideUp" | "none";

export interface SplashScreenRef {
  /** Manually hide the splash screen */
  hide: () => void;
}

export interface SplashScreenProps {
  /** Whether the splash is visible (controlled mode) */
  visible?: boolean;
  /** Auto-hide after this many ms (default: 0 = manual control) */
  autoHideDelay?: number;
  /** Logo / hero image */
  image?: ImageSourcePropType;
  /** Image width (default: 150) */
  imageWidth?: number;
  /** Image height (default: 150) */
  imageHeight?: number;
  /** App name displayed below image */
  appName?: string;
  /** Tagline displayed below app name */
  tagline?: string;
  /** Entry animation for the logo (default: "scale") */
  animation?: SplashAnimation;
  /** Animation duration in ms (default: 800) */
  animationDuration?: number;
  /** Show a loading indicator (default: true) */
  showLoader?: boolean;
  /** Loader text (e.g., "Loading…") */
  loaderText?: string;
  /** Background color override */
  backgroundColor?: string;
  /** Custom animated content (e.g., Lottie) — replaces default image */
  children?: React.ReactNode;
  /** Called when splash finishes hiding */
  onHidden?: () => void;
  /** Hide the native expo-splash-screen on mount (default: true) */
  hideNativeSplash?: boolean;
  /** Container style */
  style?: StyleProp<ViewStyle>;
}

/* ── Component ─────────────────────────────────────── */

export const SplashScreen = forwardRef<SplashScreenRef, SplashScreenProps>(
  function SplashScreen(
    {
      visible: controlledVisible,
      autoHideDelay = 0,
      image,
      imageWidth = 150,
      imageHeight = 150,
      appName,
      tagline,
      animation = "scale",
      animationDuration = 800,
      showLoader = true,
      loaderText,
      backgroundColor,
      children,
      onHidden,
      hideNativeSplash = true,
      style,
    },
    ref
  ) {
    const { theme } = useTheme();
    const [internalVisible, setInternalVisible] = useState(true);
    const isVisible = controlledVisible ?? internalVisible;

    // Animation values
    const logoOpacity = useSharedValue(0);
    const logoScale = useSharedValue(animation === "scale" ? 0.6 : 1);
    const logoTranslateY = useSharedValue(animation === "slideUp" ? 40 : 0);
    const loaderOpacity = useSharedValue(0);

    const hide = useCallback(() => {
      setInternalVisible(false);
      onHidden?.();
    }, [onHidden]);

    useImperativeHandle(ref, () => ({ hide }));

    // Hide native splash on mount
    useEffect(() => {
      if (hideNativeSplash) {
        ExpoSplashScreen.hideAsync().catch(() => {});
      }
    }, [hideNativeSplash]);

    // Entry animation
    useEffect(() => {
      if (!isVisible) return;

      const dur = animationDuration;

      // Fade in logo
      logoOpacity.value = withTiming(1, {
        duration: dur * 0.6,
        easing: Easing.out(Easing.cubic),
      });

      // Scale
      if (animation === "scale") {
        logoScale.value = withTiming(1, {
          duration: dur,
          easing: Easing.out(Easing.back(1.3)),
        });
      }

      // Slide up
      if (animation === "slideUp") {
        logoTranslateY.value = withTiming(0, {
          duration: dur,
          easing: Easing.out(Easing.cubic),
        });
      }

      // Loader fades in after logo
      loaderOpacity.value = withDelay(
        dur * 0.5,
        withTiming(1, { duration: 400 })
      );
    }, [
      isVisible,
      animation,
      animationDuration,
      logoOpacity,
      logoScale,
      logoTranslateY,
      loaderOpacity,
    ]);

    // Auto-hide
    useEffect(() => {
      if (autoHideDelay > 0) {
        const timer = setTimeout(hide, autoHideDelay);
        return () => clearTimeout(timer);
      }
    }, [autoHideDelay, hide]);

    const logoStyle = useAnimatedStyle(() => ({
      opacity: logoOpacity.value,
      transform: [
        { scale: logoScale.value },
        { translateY: logoTranslateY.value },
      ],
    }));

    const loaderStyle = useAnimatedStyle(() => ({
      opacity: loaderOpacity.value,
    }));

    if (!isVisible) return null;

    const bg = backgroundColor ?? theme.colors.background;

    return (
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(300)}
        style={[styles.container, { backgroundColor: bg }, style]}
      >
        {/* Logo / Custom Content */}
        <Animated.View style={[styles.center, logoStyle]}>
          {children ? (
            children
          ) : image ? (
            <Image
              source={image}
              style={{
                width: imageWidth,
                height: imageHeight,
                resizeMode: "contain",
              }}
            />
          ) : null}

          {appName && (
            <TText
              style={{
                fontSize: theme.typography.fontSize.xxl,
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.text,
                marginTop: 20,
                textAlign: "center",
              }}
            >
              {appName}
            </TText>
          )}

          {tagline && (
            <TText
              style={{
                fontSize: theme.typography.fontSize.base,
                color: theme.colors.textSecondary,
                marginTop: 8,
                textAlign: "center",
              }}
            >
              {tagline}
            </TText>
          )}
        </Animated.View>

        {/* Loader */}
        {showLoader && (
          <Animated.View style={[styles.loader, loaderStyle]}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            {loaderText && (
              <TText
                style={{
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textMuted,
                  marginTop: 8,
                }}
              >
                {loaderText}
              </TText>
            )}
          </Animated.View>
        )}
      </Animated.View>
    );
  }
);

/* ── Styles ────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  loader: {
    position: "absolute",
    bottom: 80,
    alignItems: "center",
  },
});
