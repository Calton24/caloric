/**
 * Onboarding Step 1 — Welcome / Value Hook
 *
 * Psychological hook: shows the end result ("Lose weight without guessing
 * calories"), 3 social-proof / feature bullets, and a single primary CTA.
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../src/theme/useTheme";
import { GlassSurface } from "../../src/ui/glass/GlassSurface";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";

const VALUE_PROPS = [
  {
    icon: "flame-outline" as const,
    title: "Personalized calorie plan",
    sub: "Tailored to your body & goals",
  },
  {
    icon: "trending-down-outline" as const,
    title: "Science-backed weight loss",
    sub: "Safe, sustainable rate every week",
  },
  {
    icon: "restaurant-outline" as const,
    title: "Log meals in seconds",
    sub: "Scan barcodes or search foods",
  },
];

export default function OnboardingWelcomeScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        {/* ── Hero ── */}
        <View style={styles.hero}>
          <Animated.View entering={FadeInDown.duration(600).delay(100)}>
            <View
              style={[
                styles.iconBubble,
                { backgroundColor: theme.colors.primary + "22" },
              ]}
            >
              <Ionicons name="flame" size={56} color={theme.colors.primary} />
            </View>
          </Animated.View>

          <TSpacer size="lg" />

          <Animated.View entering={FadeInDown.duration(600).delay(250)}>
            <TText
              variant="heading"
              style={[styles.headline, { color: theme.colors.text }]}
            >
              Lose weight{"\n"}without guessing{"\n"}calories
            </TText>
          </Animated.View>

          <TSpacer size="sm" />

          <Animated.View entering={FadeIn.duration(600).delay(400)}>
            <TText color="secondary" style={styles.subheadline}>
              Get a personalised plan in under 2 minutes
            </TText>
          </Animated.View>
        </View>

        {/* ── Value Props ── */}
        <Animated.View
          entering={FadeInUp.duration(500).delay(550)}
          style={styles.valueList}
        >
          {VALUE_PROPS.map((v, i) => (
            <GlassSurface key={i} intensity="light" style={styles.valueRow}>
              <View
                style={[
                  styles.valueIcon,
                  { backgroundColor: theme.colors.primary + "1A" },
                ]}
              >
                <Ionicons
                  name={v.icon}
                  size={22}
                  color={theme.colors.primary}
                />
              </View>
              <View style={styles.valueText}>
                <TText
                  style={[styles.valueTitle, { color: theme.colors.text }]}
                >
                  {v.title}
                </TText>
                <TText
                  style={[
                    styles.valueSub,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {v.sub}
                </TText>
              </View>
            </GlassSurface>
          ))}
        </Animated.View>

        {/* ── CTA ── */}
        <Animated.View
          entering={FadeInUp.duration(500).delay(700)}
          style={styles.ctaArea}
        >
          <Pressable
            testID="onboarding-start"
            onPress={() => router.push("/onboarding/goal" as any)}
            style={({ pressed }) => ({
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaGradient}
            >
              <TText
                style={[styles.ctaText, { color: theme.colors.textInverse }]}
              >
                Get My Plan
              </TText>
              <Ionicons
                name="arrow-forward"
                size={20}
                color={theme.colors.textInverse}
              />
            </LinearGradient>
          </Pressable>

          <TSpacer size="sm" />

          <TText color="muted" style={styles.disclaimer}>
            Takes ~2 minutes · No credit card required
          </TText>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, justifyContent: "space-between" },
  hero: {
    alignItems: "center",
    paddingTop: 48,
  },
  iconBubble: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  headline: {
    fontSize: 34,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 42,
    letterSpacing: -0.3,
  },
  subheadline: {
    fontSize: 17,
    textAlign: "center",
    lineHeight: 24,
  },
  valueList: {
    paddingHorizontal: 24,
    gap: 12,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    gap: 14,
  },
  valueIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  valueText: { flex: 1 },
  valueTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  valueSub: {
    fontSize: 13,
    marginTop: 2,
  },
  ctaArea: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  ctaGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 16,
    gap: 8,
    width: "100%",
  },
  ctaText: {
    fontSize: 18,
    fontWeight: "700",
  },
  disclaimer: {
    fontSize: 13,
    textAlign: "center",
  },
});
