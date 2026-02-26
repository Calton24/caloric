/**
 * Accordion
 * Expandable/collapsible section with animated height + rotation chevron.
 * Token-driven styling, smooth Reanimated transitions.
 *
 * Usage:
 *   <Accordion title="FAQ Item">
 *     <TText>Answer content here</TText>
 *   </Accordion>
 */

import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useState } from "react";
import {
    LayoutChangeEvent,
    Pressable,
    StyleProp,
    StyleSheet,
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
import { TText } from "../primitives/TText";

export interface AccordionProps {
  /** Header title text */
  title: string;
  /** Optional subtitle shown below title */
  subtitle?: string;
  /** Leading icon name (Ionicons) */
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  /** Controlled expanded state — omit for uncontrolled */
  expanded?: boolean;
  /** Called when header is pressed */
  onToggle?: (expanded: boolean) => void;
  /** Initially expanded (uncontrolled mode) */
  defaultExpanded?: boolean;
  /** Disable interaction */
  disabled?: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const TIMING_CONFIG = { duration: 280 };

export function Accordion({
  title,
  subtitle,
  icon,
  expanded: controlledExpanded,
  onToggle,
  defaultExpanded = false,
  disabled = false,
  children,
  style,
}: AccordionProps) {
  const { theme } = useTheme();

  // Support controlled + uncontrolled
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isControlled = controlledExpanded !== undefined;
  const isExpanded = isControlled ? controlledExpanded : internalExpanded;

  // Measure content height for animated collapse
  const [contentHeight, setContentHeight] = useState(0);
  const animatedHeight = useSharedValue(defaultExpanded ? 1 : 0);
  const chevronRotation = useSharedValue(defaultExpanded ? 1 : 0);

  const onContentLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      if (h > 0 && h !== contentHeight) {
        setContentHeight(h);
      }
    },
    [contentHeight]
  );

  const handleToggle = useCallback(() => {
    if (disabled) return;
    haptics.selection();
    const next = !isExpanded;
    if (!isControlled) setInternalExpanded(next);
    onToggle?.(next);
    animatedHeight.value = withTiming(next ? 1 : 0, TIMING_CONFIG);
    chevronRotation.value = withTiming(next ? 1 : 0, TIMING_CONFIG);
  }, [
    disabled,
    isExpanded,
    isControlled,
    onToggle,
    animatedHeight,
    chevronRotation,
  ]);

  // Sync controlled state changes
  React.useEffect(() => {
    if (isControlled) {
      animatedHeight.value = withTiming(
        controlledExpanded ? 1 : 0,
        TIMING_CONFIG
      );
      chevronRotation.value = withTiming(
        controlledExpanded ? 1 : 0,
        TIMING_CONFIG
      );
    }
  }, [controlledExpanded, isControlled, animatedHeight, chevronRotation]);

  const bodyStyle = useAnimatedStyle(() => ({
    height:
      contentHeight > 0 ? animatedHeight.value * contentHeight : undefined,
    opacity: animatedHeight.value,
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value * 180}deg` }],
  }));

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
        },
        style,
      ]}
    >
      {/* Header */}
      <Pressable
        onPress={handleToggle}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded: isExpanded, disabled }}
        style={[
          styles.header,
          {
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.md,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={theme.colors.textSecondary}
            style={{ marginRight: theme.spacing.sm }}
          />
        )}
        <View style={styles.titleWrap}>
          <TText style={styles.titleText}>{title}</TText>
          {subtitle && (
            <TText color="muted" style={styles.subtitleText}>
              {subtitle}
            </TText>
          )}
        </View>
        <Animated.View style={chevronStyle}>
          <Ionicons
            name="chevron-down"
            size={18}
            color={theme.colors.textMuted}
          />
        </Animated.View>
      </Pressable>

      {/* Collapsible body */}
      <Animated.View style={[styles.bodyOuter, bodyStyle]}>
        <View
          style={[
            styles.bodyInner,
            {
              paddingHorizontal: theme.spacing.md,
              paddingBottom: theme.spacing.md,
            },
          ]}
          onLayout={onContentLayout}
        >
          <View
            style={[styles.divider, { backgroundColor: theme.colors.divider }]}
          />
          <View style={{ paddingTop: theme.spacing.sm }}>{children}</View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  titleWrap: {
    flex: 1,
  },
  titleText: {
    fontSize: 15,
    fontWeight: "600",
  },
  subtitleText: {
    fontSize: 12,
    marginTop: 2,
  },
  bodyOuter: {
    overflow: "hidden",
  },
  bodyInner: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
});
