/**
 * RetryState
 * Error / failure screen with retry action. Pairs with EmptyState.
 *
 * Usage:
 *   <RetryState
 *     title="Something went wrong"
 *     subtitle="Check your connection and try again."
 *     onRetry={() => refetch()}
 *   />
 */

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";
import { useTheme } from "../../theme/useTheme";
import { TButton } from "../primitives/TButton";
import { TText } from "../primitives/TText";

export interface RetryStateProps {
  /** Title text */
  title?: string;
  /** Description / help text */
  subtitle?: string;
  /** Ionicon name for the big icon */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Retry button handler */
  onRetry?: () => void;
  /** Retry button label */
  retryLabel?: string;
  /** Show loading spinner on the retry icon */
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function RetryState({
  title = "Something went wrong",
  subtitle = "Please try again.",
  icon = "cloud-offline-outline",
  onRetry,
  retryLabel = "Try Again",
  loading = false,
  style,
}: RetryStateProps) {
  const { theme } = useTheme();

  // Spin animation for loading
  const rotation = useSharedValue(0);
  React.useEffect(() => {
    if (loading) {
      rotation.value = withRepeat(
        withTiming(360, { duration: 1000, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      rotation.value = 0;
    }
    // rotation is a stable useSharedValue ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View style={[styles.container, style]} accessibilityRole="alert">
      <Animated.View style={loading ? spinStyle : undefined}>
        <Ionicons
          name={loading ? "sync-outline" : icon}
          size={56}
          color={theme.colors.textMuted}
        />
      </Animated.View>
      <TText style={[styles.title, { color: theme.colors.text }]}>
        {title}
      </TText>
      <TText style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        {subtitle}
      </TText>
      {onRetry && (
        <TButton
          onPress={onRetry}
          variant="outline"
          size="sm"
          disabled={loading}
          style={styles.button}
        >
          {retryLabel}
        </TButton>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 32,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  button: {
    marginTop: 16,
  },
});
