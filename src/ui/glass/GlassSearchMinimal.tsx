/**
 * GlassSearchMinimal
 * Compact search bar without cancel button — ideal for embedded/inline use.
 *
 * Same glass styling as GlassSearch but no focus-triggered cancel animation.
 * Includes clear button, animated focus ring, and haptic feedback.
 */

import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useRef } from "react";
import {
    Pressable,
    StyleProp,
    StyleSheet,
    TextInput,
    View,
    ViewStyle,
} from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { haptics } from "../../infrastructure/haptics";
import { useTheme } from "../../theme/useTheme";
import { GlassSurface } from "./GlassSurface";

/* ── Types ─────────────────────────────────────────── */

export interface GlassSearchMinimalProps {
  /** Current search value */
  value: string;
  /** Change handler */
  onChangeText: (text: string) => void;
  /** Placeholder (default: "Search") */
  placeholder?: string;
  /** Called when search is submitted */
  onSubmit?: (text: string) => void;
  /** Auto-focus on mount */
  autoFocus?: boolean;
  /** Pass-through for GlassSurface intensity */
  intensity?: number;
  /** Pass-through for GlassSurface tint */
  tint?: "light" | "dark" | "default";
  /** Container style */
  style?: StyleProp<ViewStyle>;
}

/* ── Component ─────────────────────────────────────── */

export function GlassSearchMinimal({
  value,
  onChangeText,
  placeholder = "Search",
  onSubmit,
  autoFocus = false,
  intensity,
  tint,
  style,
}: GlassSearchMinimalProps) {
  const { theme } = useTheme();
  const inputRef = useRef<TextInput>(null);

  const focusRingOpacity = useSharedValue(0);

  const handleFocus = useCallback(() => {
    focusRingOpacity.value = withTiming(1, { duration: 150 });
    haptics.impact("light");
  }, [focusRingOpacity]);

  const handleBlur = useCallback(() => {
    focusRingOpacity.value = withTiming(0, { duration: 150 });
  }, [focusRingOpacity]);

  const handleClear = useCallback(() => {
    onChangeText("");
    inputRef.current?.focus();
    haptics.selection();
  }, [onChangeText]);

  const focusRingStyle = useAnimatedStyle(() => ({
    borderWidth: 1.5,
    borderColor: theme.colors.primary + "60",
    opacity: focusRingOpacity.value,
  }));

  return (
    <View style={[styles.wrapper, style]}>
      <GlassSurface
        variant="pill"
        intensity={intensity}
        tint={tint}
        style={styles.surface}
      >
        <Ionicons
          name="search"
          size={18}
          color={theme.colors.textMuted}
          style={styles.searchIcon}
        />
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={() => onSubmit?.(value)}
          returnKeyType="search"
          autoFocus={autoFocus}
          autoCorrect={false}
          autoCapitalize="none"
          style={[
            styles.input,
            {
              color: theme.colors.text,
              fontSize: theme.typography.fontSize.base,
            },
          ]}
        />
        {value.length > 0 && (
          <Pressable onPress={handleClear} hitSlop={8} style={styles.clearBtn}>
            <Ionicons
              name="close-circle"
              size={18}
              color={theme.colors.textMuted}
            />
          </Pressable>
        )}
      </GlassSurface>
      {/* Animated focus ring overlay */}
      <Animated.View
        style={[styles.focusRing, { borderRadius: 999 }, focusRingStyle]}
        pointerEvents="none"
      />
    </View>
  );
}

/* ── Styles ────────────────────────────────────────── */

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
  },
  surface: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    padding: 0,
    margin: 0,
  },
  clearBtn: {
    marginLeft: 6,
  },
  focusRing: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: "none",
  },
});
