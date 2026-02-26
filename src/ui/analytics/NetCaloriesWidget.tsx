/**
 * NetCaloriesWidget
 * Dynamic calorie budget widget showing base goal + activity bonus.
 *
 * The ring represents consumed vs total budget.
 * Handles over-budget state with warning badge.
 *
 * Usage:
 *   <NetCaloriesWidget
 *     baseGoal={2000}
 *     consumed={1580}
 *     activityBonus={500}
 *   />
 */

import React, { useEffect } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
    Easing,
    useAnimatedProps,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "../../theme/useTheme";
import { TBadge } from "../primitives/TBadge";
import { TText } from "../primitives/TText";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface NetCaloriesWidgetProps {
  /** Base daily calorie goal */
  baseGoal: number;
  /** Calories consumed so far */
  consumed: number;
  /** Bonus calories earned from activity */
  activityBonus: number;
  /** Widget title */
  title?: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Max allowed activity bonus (safety cap) */
  capBonus?: number;
  /** Ring size */
  size?: number;
  /** Ring stroke width */
  strokeWidth?: number;
  /** Ring color override */
  ringColor?: string;
  style?: StyleProp<ViewStyle>;
}

export function NetCaloriesWidget({
  baseGoal,
  consumed,
  activityBonus,
  title = "Calorie Budget",
  subtitle,
  capBonus,
  size = 80,
  strokeWidth = 6,
  ringColor,
  style,
}: NetCaloriesWidgetProps) {
  const { theme } = useTheme();

  // ── Derived values ──
  const effectiveBonus = capBonus
    ? Math.min(activityBonus, capBonus)
    : activityBonus;
  const budget = baseGoal + effectiveBonus;
  const remainingNet = budget - consumed;
  const isOverBudget = remainingNet < 0;
  const progress = Math.min(Math.max(consumed / budget, 0), 1);

  // ── Colors ──
  const defaultRingColor = isOverBudget
    ? theme.colors.error
    : theme.colors.success;
  const activeColor = ringColor ?? defaultRingColor;
  const trackColor = activeColor + "18";

  // ── Animated progress ring ──
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const animProgress = useSharedValue(0);
  useEffect(() => {
    animProgress.value = withTiming(progress, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [animProgress, progress]);

  const animProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animProgress.value),
  }));

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.xl,
          borderColor: theme.colors.borderSecondary,
        },
        style,
      ]}
    >
      {/* ── Header ── */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <TText color="secondary" style={styles.title}>
            {title}
          </TText>
          {subtitle && (
            <TText
              color="secondary"
              style={[styles.subtitle, { color: theme.colors.textMuted }]}
            >
              {subtitle}
            </TText>
          )}
        </View>
        {isOverBudget && <TBadge label="Over" tone="error" size="sm" />}
      </View>

      {/* ── Body: left info + right ring ── */}
      <View style={styles.body}>
        {/* Left column */}
        <View style={styles.leftCol}>
          {/* Main number */}
          <View style={styles.mainNumberRow}>
            <TText
              style={[
                styles.mainNumber,
                {
                  color: isOverBudget ? theme.colors.error : theme.colors.text,
                },
              ]}
            >
              {isOverBudget
                ? `+${Math.abs(remainingNet).toLocaleString()}`
                : remainingNet.toLocaleString()}
            </TText>
            <TText style={[styles.mainUnit, { color: theme.colors.textMuted }]}>
              {isOverBudget ? "over" : "left"}
            </TText>
          </View>

          {/* Detail rows */}
          <View style={styles.detailRows}>
            <DetailRow
              label="Budget"
              value={`${baseGoal.toLocaleString()} + ${effectiveBonus.toLocaleString()}`}
              valueColor={theme.colors.text}
              labelColor={theme.colors.textMuted}
            />
            <DetailRow
              label="Consumed"
              value={consumed.toLocaleString()}
              valueColor={isOverBudget ? theme.colors.error : theme.colors.text}
              labelColor={theme.colors.textMuted}
            />
            <DetailRow
              label="Earned"
              value={`+${effectiveBonus.toLocaleString()}`}
              valueColor={theme.colors.success}
              labelColor={theme.colors.textMuted}
            />
          </View>
        </View>

        {/* Right: progress ring */}
        <View style={styles.ringWrap}>
          <Svg width={size} height={size}>
            {/* Track */}
            <Circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={trackColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            {/* Progress */}
            <AnimatedCircle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={activeColor}
              strokeWidth={strokeWidth}
              strokeDasharray={`${circumference} ${circumference}`}
              strokeLinecap="round"
              animatedProps={animProps}
              rotation={-90}
              origin={`${center}, ${center}`}
            />
          </Svg>

          {/* Center label */}
          <View style={[styles.ringCenter, { width: size, height: size }]}>
            <TText style={[styles.ringPercent, { color: activeColor }]}>
              {Math.round(progress * 100)}%
            </TText>
          </View>
        </View>
      </View>

      {/* ── Budget equation ── */}
      <View
        style={[
          styles.equationRow,
          { backgroundColor: theme.colors.backgroundSecondary },
        ]}
      >
        <TText style={[styles.equationText, { color: theme.colors.textMuted }]}>
          {baseGoal.toLocaleString()} base + {effectiveBonus.toLocaleString()}{" "}
          earned = {budget.toLocaleString()} total
        </TText>
      </View>
    </View>
  );
}

// ── Detail row sub-component ──
function DetailRow({
  label,
  value,
  valueColor,
  labelColor,
}: {
  label: string;
  value: string;
  valueColor: string;
  labelColor: string;
}) {
  return (
    <View style={styles.detailRow}>
      <TText style={[styles.detailLabel, { color: labelColor }]}>{label}</TText>
      <TText style={[styles.detailValue, { color: valueColor }]}>{value}</TText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  body: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  leftCol: {
    flex: 1,
    marginRight: 16,
  },
  mainNumberRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 12,
  },
  mainNumber: {
    fontSize: 32,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  mainUnit: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 6,
  },
  detailRows: {
    gap: 4,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  ringWrap: {
    position: "relative",
  },
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  ringPercent: {
    fontSize: 16,
    fontWeight: "700",
  },
  equationRow: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  equationText: {
    fontSize: 11,
    fontWeight: "500",
  },
});
