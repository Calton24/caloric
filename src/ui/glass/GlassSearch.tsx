/**
 * GlassSearch
 * iOS 26 Liquid Glass–style search bar.
 *
 * Features:
 * - Glassmorphism background (GlassSurface pill variant)
 * - Search icon + text input + optional clear button
 * - Cancel button slides in when focused
 * - Animated focus ring
 * - Token-driven colors & spacing via useTheme()
 */

import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useRef, useState } from "react";
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
import { useTheme } from "../../theme/useTheme";
import { GlassSurface } from "../glass/GlassSurface";
import { TText } from "../primitives/TText";

/* ── Types ─────────────────────────────────────────── */

export interface GlassSearchProps {
  /** Current search value */
  value: string;
  /** Change handler */
  onChangeText: (text: string) => void;
  /** Placeholder (default: "Search") */
  placeholder?: string;
  /** Called when search is submitted */
  onSubmit?: (text: string) => void;
  /** Called when cancel is pressed */
  onCancel?: () => void;
  /** Show cancel button when focused (default: true) */
  showCancel?: boolean;
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

export function GlassSearch({
  value,
  onChangeText,
  placeholder = "Search",
  onSubmit,
  onCancel,
  showCancel = true,
  autoFocus = false,
  intensity,
  tint,
  style,
}: GlassSearchProps) {
  const { theme } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  const cancelWidth = useSharedValue(0);
  const cancelOpacity = useSharedValue(0);

  const handleFocus = useCallback(() => {
    setFocused(true);
    if (showCancel) {
      cancelWidth.value = withTiming(60, { duration: 200 });
      cancelOpacity.value = withTiming(1, { duration: 200 });
    }
  }, [showCancel, cancelWidth, cancelOpacity]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    cancelWidth.value = withTiming(0, { duration: 200 });
    cancelOpacity.value = withTiming(0, { duration: 200 });
  }, [cancelWidth, cancelOpacity]);

  const handleCancel = useCallback(() => {
    onChangeText("");
    inputRef.current?.blur();
    onCancel?.();
  }, [onChangeText, onCancel]);

  const handleClear = useCallback(() => {
    onChangeText("");
    inputRef.current?.focus();
  }, [onChangeText]);

  const cancelStyle = useAnimatedStyle(() => ({
    width: cancelWidth.value,
    opacity: cancelOpacity.value,
  }));

  return (
    <View style={[styles.wrapper, style]}>
      <GlassSurface
        variant="pill"
        intensity={intensity}
        tint={tint}
        style={[
          styles.surface,
          focused && {
            borderWidth: 1.5,
            borderColor: theme.colors.primary + "60",
          },
        ]}
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

      {showCancel && (
        <Animated.View style={[styles.cancelContainer, cancelStyle]}>
          <Pressable onPress={handleCancel}>
            <TText
              style={{
                color: theme.colors.primary,
                fontSize: theme.typography.fontSize.base,
                fontWeight: theme.typography.fontWeight.medium,
              }}
            >
              Cancel
            </TText>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

/* ── Styles ────────────────────────────────────────── */

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  surface: {
    flex: 1,
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
  cancelContainer: {
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "flex-end",
    marginLeft: 8,
  },
});
