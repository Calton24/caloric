import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>� Mobile Core</Text>
          <Text style={styles.subtitle}>Component Library</Text>
        </View>

        {/* Welcome Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome</Text>
          <Text style={styles.cardText}>
            This is a reusable component library built with Expo and React Native.
            Explore the Playground tab to see all available components.
          </Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>🎨</Text>
            <Text style={styles.statValue}>14</Text>
            <Text style={styles.statLabel}>Components</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>⚡</Text>
            <Text style={styles.statValue}>Swift UI</Text>
            <Text style={styles.statLabel}>Inspired</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>📦</Text>
            <Text style={styles.statValue}>@expo/ui</Text>
            <Text style={styles.statLabel}>Powered</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>🚀</Text>
            <Text style={styles.statValue}>Ready</Text>
            <Text style={styles.statLabel}>For Use</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Check out the Playground tab to explore components →
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
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
    marginBottom: 24,
    paddingVertical: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: "#666",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
    marginBottom: 12,
  },
  cardText: {
    fontSize: 15,
    color: "#666",
    lineHeight: 22,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: "47%",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#007AFF",
    textAlign: "center",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
  },
});
