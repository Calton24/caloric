/**
 * DailyInsightsCard
 *
 * Displays contextual insights comparing today's eating against
 * yesterday, last week, and similar past meals.
 * Shows at most 3 insights; hides entirely when none are available.
 */

import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import {
    generateDailyInsights,
    type DailyInsight,
    type InsightMessage,
} from "../../features/nutrition/daily-insights.service";
import type { MealEntry } from "../../features/nutrition/nutrition.types";
import { formatWeekdayLong } from "../../infrastructure/i18n";
import { useAppTranslation } from "../../infrastructure/i18n/useAppTranslation";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";

interface Props {
  allMeals: MealEntry[];
  todayDate: string;
}

export function DailyInsightsCard({ allMeals, todayDate }: Props) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();

  const insights = useMemo(
    () => generateDailyInsights(allMeals, todayDate),
    [allMeals, todayDate]
  );

  if (insights.length === 0) return null;

  return (
    <View
      style={[styles.card, { backgroundColor: theme.colors.surfaceSecondary }]}
    >
      <View style={styles.header}>
        <Ionicons
          name="bulb-outline"
          size={14}
          color={theme.colors.textMuted}
        />
        <TText style={[styles.headerLabel, { color: theme.colors.textMuted }]}>
          {t("insights.header")}
        </TText>
      </View>
      {insights.map((insight, i) => (
        <InsightRow
          key={insight.kind}
          insight={insight}
          isLast={i === insights.length - 1}
        />
      ))}
    </View>
  );
}

function InsightRow({
  insight,
  isLast,
}: {
  insight: DailyInsight;
  isLast: boolean;
}) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();

  /** Resolve an InsightMessage to a localized string */
  const resolveMessage = (msg: InsightMessage): string => {
    // If params contain a 'date' ISO string, convert to localized weekday
    const params = msg.params ? { ...msg.params } : undefined;
    if (params?.date && typeof params.date === "string") {
      params.weekday = formatWeekdayLong(new Date(params.date + "T12:00:00"));
      delete params.date;
    }
    return t(msg.key, params);
  };

  return (
    <View
      style={[
        styles.row,
        !isLast && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: theme.colors.primary + "18" },
        ]}
      >
        <Ionicons
          name={insight.icon as any}
          size={16}
          color={theme.colors.primary}
        />
      </View>
      <View style={styles.textCol}>
        <TText
          style={[styles.message, { color: theme.colors.text }]}
          numberOfLines={2}
        >
          {resolveMessage(insight.message)}
        </TText>
        {insight.detail && (
          <TText
            style={[styles.detail, { color: theme.colors.textMuted }]}
            numberOfLines={1}
          >
            {resolveMessage(insight.detail)}
          </TText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 10,
    marginBottom: 6,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: {
    flex: 1,
  },
  message: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  detail: {
    fontSize: 11,
    fontWeight: "400",
    marginTop: 2,
  },
});
