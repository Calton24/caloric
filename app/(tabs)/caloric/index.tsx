/**
 * Caloric — Catalog Menu
 * Entry point: routes to Primitives, Glass, Patterns, Widgets sub-screens.
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../../src/theme/useTheme";
import { GlassCard } from "../../../src/ui/glass/GlassCard";
import { TSpacer } from "../../../src/ui/primitives/TSpacer";
import { TText } from "../../../src/ui/primitives/TText";

const AnimatedIonicons = Animated.createAnimatedComponent(Ionicons);

interface CatalogEntry {
  key: string;
  route: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  count: number;
}

const GROWTH_ENTRY: CatalogEntry = {
  key: "growth",
  route: "/(tabs)/caloric/growth",
  title: "Growth Layer",
  subtitle: "Feature request sheet + milestone tracking",
  icon: "rocket-outline",
  count: 1,
};

const PUSH_ENTRY: CatalogEntry = {
  key: "push",
  route: "/(tabs)/caloric/push",
  title: "Push Notifications",
  subtitle: "Permissions, token, local test, badge clear",
  icon: "notifications-outline",
  count: 4,
};

const I18N_ENTRY: CatalogEntry = {
  key: "i18n",
  route: "/(tabs)/caloric/i18n",
  title: "Internationalisation",
  subtitle: "Language switching, translations, formatting",
  icon: "language-outline",
  count: 6,
};

const PRESENCE_ENTRY: CatalogEntry = {
  key: "presence",
  route: "/(tabs)/caloric/presence",
  title: "Presence / Lifecycle",
  subtitle: "AppState lifecycle detection, transition log",
  icon: "pulse-outline",
  count: 2,
};

const ACTIVITY_ENTRY: CatalogEntry = {
  key: "activity",
  route: "/(tabs)/caloric/activity",
  title: "Activity Monitor",
  subtitle: "In-app activities: steps, ETA, timer, progress",
  icon: "fitness-outline",
  count: 4,
};

const LIVE_ACTIVITY_ENTRY: CatalogEntry = {
  key: "live-activity",
  route: "/(tabs)/caloric/live-activity",
  title: "Live Activities",
  subtitle: "expo-widgets: start, update, end Live Activities (iOS)",
  icon: "flash-outline",
  count: 3,
};

const MAINTENANCE_ENTRY: CatalogEntry = {
  key: "maintenance",
  route: "/(tabs)/caloric/maintenance",
  title: "Maintenance",
  subtitle: "Degraded-mode states, overrides, outage monitor",
  icon: "construct-outline",
  count: 6,
};

const CATALOG: CatalogEntry[] = [
  {
    key: "primitives",
    route: "/(tabs)/caloric/primitives",
    title: "Primitives",
    subtitle:
      "TText, TButton, TInput, TBadge, TDivider, Skeleton, Progress, Slider",
    icon: "cube-outline",
    count: 14,
  },
  {
    key: "glass",
    route: "/(tabs)/caloric/glass",
    title: "Glass Widgets",
    subtitle:
      "IconButton, TogglePill, Slider, Segmented, Chips, MiniCard, Search",
    icon: "sparkles-outline",
    count: 10,
  },
  {
    key: "patterns",
    route: "/(tabs)/caloric/patterns",
    title: "Patterns",
    subtitle:
      "ScreenShell, GlassHeader, SettingsList, ListRow, StickyFooter, Sheets",
    icon: "grid-outline",
    count: 12,
  },
  {
    key: "widgets",
    route: "/(tabs)/caloric/widgets",
    title: "Analytics Widgets",
    subtitle:
      "SpendingCard, ActivityRings, StepCounter, HeartRate, Sleep, Water",
    icon: "bar-chart-outline",
    count: 6,
  },
  ...(__DEV__
    ? [
        GROWTH_ENTRY,
        PUSH_ENTRY,
        I18N_ENTRY,
        PRESENCE_ENTRY,
        ACTIVITY_ENTRY,
        LIVE_ACTIVITY_ENTRY,
        MAINTENANCE_ENTRY,
      ]
    : []),
];

export default function CaloricMenu() {
  const { theme, toggleMode } = useTheme();
  const router = useRouter();

  const opacity = useSharedValue(1);
  const handleToggleMode = () => {
    opacity.value = withSequence(
      withTiming(0, { duration: 150 }),
      withTiming(1, { duration: 150 })
    );
    setTimeout(() => toggleMode(), 75);
  };
  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={["top"]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <TText variant="heading">Caloric</TText>
          <TText color="muted" style={styles.tagline}>
            UI Construction Kit
          </TText>
        </View>
        <Pressable onPress={handleToggleMode}>
          <AnimatedIonicons
            name={theme.mode === "dark" ? "sunny" : "moon"}
            size={24}
            color={theme.colors.text}
            style={animStyle}
          />
        </Pressable>
      </View>

      <TSpacer size="lg" />

      {/* Catalog cards */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {CATALOG.map((entry) => (
          <Pressable
            key={entry.key}
            onPress={() => router.push(entry.route as never)}
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
          >
            <GlassCard
              padding="md"
              style={[
                styles.card,
                { borderColor: theme.colors.borderSecondary, borderWidth: 1 },
              ]}
            >
              <View style={styles.cardRow}>
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: theme.colors.primary + "15" },
                  ]}
                >
                  <Ionicons
                    name={entry.icon}
                    size={24}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.cardText}>
                  <TText style={styles.cardTitle}>{entry.title}</TText>
                  <TText color="muted" style={styles.cardSub}>
                    {entry.subtitle}
                  </TText>
                </View>
                <View style={styles.countChevron}>
                  <View
                    style={[
                      styles.countBadge,
                      { backgroundColor: theme.colors.primary + "18" },
                    ]}
                  >
                    <TText
                      style={[
                        styles.countText,
                        { color: theme.colors.primary },
                      ]}
                    >
                      {entry.count}
                    </TText>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={theme.colors.textMuted}
                  />
                </View>
              </View>
            </GlassCard>
            <TSpacer size="sm" />
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
  },
  tagline: {
    fontSize: 14,
    marginTop: 2,
  },
  card: {
    marginBottom: 0,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  cardSub: {
    fontSize: 13,
    marginTop: 2,
  },
  countChevron: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  countText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
