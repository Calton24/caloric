import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../src/theme/useTheme";
import { GlassCard } from "../../src/ui/glass/GlassCard";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";

export default function HomeScreen() {
  const { theme } = useTheme();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={["top"]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TText variant="heading" style={styles.title}>
            Mobile Core
          </TText>
          <TText color="secondary" style={styles.subtitle}>
            Component Library
          </TText>
        </View>

        <TSpacer size="md" />

        {/* Welcome Card */}
        <GlassCard style={styles.card}>
          <TText variant="heading" style={styles.cardTitle}>
            Welcome
          </TText>
          <TSpacer size="sm" />
          <TText color="secondary" style={styles.cardText}>
            This is a reusable component library built with Expo and React
            Native. Explore the Playground tab to see all available components.
          </TText>
        </GlassCard>

        <TSpacer size="md" />

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          {[
            { emoji: "🎨", value: "14", label: "Components" },
            { emoji: "⚡", value: "Swift UI", label: "Inspired" },
            { emoji: "📦", value: "@expo/ui", label: "Powered" },
            { emoji: "🚀", value: "Ready", label: "For Use" },
          ].map((stat) => (
            <GlassCard key={stat.label} style={styles.statCard}>
              <TText style={styles.statEmoji}>{stat.emoji}</TText>
              <TText color="primary" style={styles.statValue}>
                {stat.value}
              </TText>
              <TText color="secondary" style={styles.statLabel}>
                {stat.label}
              </TText>
            </GlassCard>
          ))}
        </View>

        <TSpacer size="md" />

        {/* Footer */}
        <View style={styles.footer}>
          <TText color="primary" style={styles.footerText}>
            Check out the Playground tab to explore components →
          </TText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    alignItems: "center",
    paddingVertical: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 18,
    marginTop: 8,
  },
  card: {
    padding: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  cardText: {
    fontSize: 15,
    lineHeight: 22,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  statCard: {
    width: "47%",
    padding: 16,
    alignItems: "center",
  },
  statEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
