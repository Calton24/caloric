/**
 * GlassSearch
 * iOS 26 Liquid Glass–style search bar.
 *
 * Features:
 * - Glassmorphism background (GlassSurface pill variant)
 * - Search icon + text input + optional clear button
 * - Cancel button animates in/out via native LayoutAnimation
 * - Animated focus ring
 * - Token-driven colors & spacing via useTheme()
 */

import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useRef, useState } from "react";
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  TextInput,
  UIManager,
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
import { GlassSurface } from "../glass/GlassSurface";
import { TText } from "../primitives/TText";

/* ── Enable LayoutAnimation on Android ────────────── */

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/* ── Native layout animation config ───────────────── */

const LAYOUT_ANIM = LayoutAnimation.create(
  250,
  LayoutAnimation.Types.easeInEaseOut,
  LayoutAnimation.Properties.scaleX
);

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
  const [cancelVisible, setCancelVisible] = useState(false);

  // Focus ring (Reanimated — runs on UI thread)
  const focusRingOpacity = useSharedValue(0);

  const handleFocus = useCallback(() => {
    focusRingOpacity.value = withTiming(1, { duration: 150 });
    if (showCancel) {
      LayoutAnimation.configureNext(LAYOUT_ANIM);
      setCancelVisible(true);
    }
    haptics.impact("light");
  }, [showCancel, focusRingOpacity]);

  const handleBlur = useCallback(() => {
    focusRingOpacity.value = withTiming(0, { duration: 150 });
    LayoutAnimation.configureNext(LAYOUT_ANIM);
    setCancelVisible(false);
  }, [focusRingOpacity]);

  const handleCancel = useCallback(() => {
    onChangeText("");
    inputRef.current?.blur();
    onCancel?.();
    haptics.impact("light");
  }, [onChangeText, onCancel]);

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
      <View style={{ flex: 1 }}>
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
            <Pressable
              onPress={handleClear}
              hitSlop={8}
              style={styles.clearBtn}
            >
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

      {cancelVisible && (
        <Pressable onPress={handleCancel} style={styles.cancelButton}>
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
  cancelButton: {
    marginLeft: 12,
    justifyContent: "center",
  },
  focusRing: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: "none",
  },
});
  },
});
