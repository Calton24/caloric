/**
 * DayJourneyBanner
 *
 * Shows the exact day-by-day journey header + sub on the home screen.
 * Every single day 1-21+ has specific intentional copy.
 * Only shown when the user has NOT logged today.
 */

import React from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import type { JourneyPhase } from "../../features/retention/day-journey";
import { useAppTranslation } from "../../infrastructure/i18n/useAppTranslation";
import { useTheme } from "../../theme/useTheme";
import { GlassSurface } from "../glass/GlassSurface";
import { TText } from "../primitives/TText";

interface DayJourneyBannerProps {
  header: string;
  sub: string;
  phase: JourneyPhase;
  day: number;
}

const PHASE_EMOJI: Record<JourneyPhase, string> = {
  hook: "🔥",
  commitment: "🔒",
  identity: "⚡",
  "lock-in": "🏆",
  post: "👑",
};

const PHASE_ACCENT: Record<JourneyPhase, string> = {
  hook: "#F59E0B",
  commitment: "#3B82F6",
  identity: "#8B5CF6",
  "lock-in": "#EF4444",
  post: "#10B981",
};

export function DayJourneyBanner({
  header,
  sub,
  phase,
  day,
}: DayJourneyBannerProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const accent = PHASE_ACCENT[phase];

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(200)}>
      <GlassSurface variant="card" intensity="light" style={styles.banner}>
        <View style={[styles.dayBadge, { backgroundColor: accent }]}>
          <TText style={styles.dayBadgeText}>
            {t("dayJourney.dayBadge", { day })}
          </TText>
        </View>
        <View style={styles.textBlock}>
          <TText style={[styles.header, { color: theme.colors.text }]}>
            {header}
          </TText>
          <TText
            style={[styles.sub, { color: theme.colors.textMuted }]}
            numberOfLines={2}
          >
            {sub}
          </TText>
        </View>
        <TText style={styles.phaseEmoji}>{PHASE_EMOJI[phase]}</TText>
      </GlassSurface>
    </Animated.View>
  );
}

/** Keep old name as alias for backward compat */
export function DailyMotivationBanner({
  message,
  emoji,
}: {
  message: string;
  emoji: string;
}) {
  return <DayJourneyBanner header={message} sub="" phase="hook" day={0} />;
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
  },
  dayBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 52,
    alignItems: "center",
  },
  dayBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  header: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  sub: {
    fontSize: 13,
    lineHeight: 18,
  },
  phaseEmoji: {
    fontSize: 22,
  },
});
