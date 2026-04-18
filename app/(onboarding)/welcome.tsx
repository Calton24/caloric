/**
 * Onboarding Step 1 — Welcome / Value Hook
 *
 * Psychological hook: shows the end result ("Lose weight without guessing
 * calories"), 3 social-proof / feature bullets, and a single primary CTA.
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  getWelcomeCtaCopy,
  trackExperimentClick,
  trackExperimentExposure,
  useExperiment,
} from "../../src/experiments";
import { useAppTranslation } from "../../src/infrastructure/i18n/useAppTranslation";
import { useTheme } from "../../src/theme/useTheme";
import { GlassSurface } from "../../src/ui/glass/GlassSurface";
import { TText } from "../../src/ui/primitives/TText";

const VALUE_PROPS = [
  {
    icon: "flame-outline" as const,
    titleKey: "welcome.feature1Title",
    subKey: "welcome.feature1Sub",
  },
  {
    icon: "trending-down-outline" as const,
    titleKey: "welcome.feature2Title",
    subKey: "welcome.feature2Sub",
  },
  {
    icon: "restaurant-outline" as const,
    titleKey: "welcome.feature3Title",
    subKey: "welcome.feature3Sub",
  },
];

export default function OnboardingWelcomeScreen() {
  const { theme } = useTheme();
  const { t, language } = useAppTranslation();
  const router = useRouter();

  // A/B experiment: welcome CTA copy
  const ctaVariant = useExperiment("welcome_cta_v1");
  const locale = language;
  const exposureTracked = useRef(false);

  useEffect(() => {
    if (ctaVariant && !exposureTracked.current) {
      exposureTracked.current = true;
      trackExperimentExposure({
        experiment: "welcome_cta_v1",
        variant: ctaVariant,
        locale,
        screen: "welcome",
      });
    }
  }, [ctaVariant, locale]);

  const ctaCopy = ctaVariant
    ? getWelcomeCtaCopy(locale, ctaVariant)
    : t("welcome.cta");

  const handleCtaPress = () => {
    if (ctaVariant) {
      trackExperimentClick({
        experiment: "welcome_cta_v1",
        variant: ctaVariant,
        locale,
        screen: "welcome",
      });
    }
    router.push("/(onboarding)/goal" as any);
  };

  // CTA press animation
  const ctaScale = useSharedValue(1);
  const ctaAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ctaScale.value }],
  }));

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        {/* ── Hero ── */}
        <View style={styles.hero}>
          <Animated.View
            entering={FadeInDown.springify().damping(14).delay(100)}
          >
            <LinearGradient
              colors={[theme.colors.primary + "20", theme.colors.accent + "10"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconBubble}
            >
              <Ionicons name="flame" size={52} color={theme.colors.primary} />
            </LinearGradient>
          </Animated.View>

          <View style={{ height: 28 }} />

          <Animated.View entering={FadeInDown.duration(600).delay(200)}>
            <TText
              variant="heading"
              style={[styles.headline, { color: theme.colors.text }]}
            >
              {t("welcome.heading")}
            </TText>
          </Animated.View>

          <View style={{ height: 12 }} />

          <Animated.View entering={FadeIn.duration(600).delay(350)}>
            <TText
              style={[
                styles.subheadline,
                { color: theme.colors.textSecondary },
              ]}
            >
              {t("welcome.subheading")}
            </TText>
          </Animated.View>
        </View>

        {/* ── Value Props ── */}
        <View style={styles.valueList}>
          {VALUE_PROPS.map((v, i) => (
            <Animated.View
              key={i}
              entering={FadeInUp.springify()
                .damping(18)
                .delay(500 + i * 100)}
            >
              <GlassSurface intensity="light" style={styles.valueRow}>
                <View
                  style={[
                    styles.valueIcon,
                    { backgroundColor: theme.colors.primary + "15" },
                  ]}
                >
                  <Ionicons
                    name={v.icon}
                    size={24}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.valueText}>
                  <TText
                    style={[styles.valueTitle, { color: theme.colors.text }]}
                  >
                    {t(v.titleKey)}
                  </TText>
                  <TText
                    style={[
                      styles.valueSub,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {t(v.subKey)}
                  </TText>
                </View>
              </GlassSurface>
            </Animated.View>
          ))}
        </View>

        {/* ── CTA ── */}
        <Animated.View
          entering={FadeInUp.duration(500).delay(850)}
          style={styles.ctaArea}
        >
          <Animated.View style={ctaAnimStyle}>
            <Pressable
              testID="onboarding-start"
              onPress={handleCtaPress}
              onPressIn={() => {
                ctaScale.value = withSpring(0.96, {
                  damping: 15,
                  stiffness: 300,
                });
              }}
              onPressOut={() => {
                ctaScale.value = withSpring(1, {
                  damping: 15,
                  stiffness: 300,
                });
              }}
            >
              <View
                style={[
                  styles.ctaShadow,
                  { backgroundColor: theme.colors.primary + "30" },
                ]}
              />
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaGradient}
              >
                <TText
                  style={[styles.ctaText, { color: theme.colors.textInverse }]}
                >
                  {ctaCopy}
                </TText>
                <Ionicons
                  name="arrow-forward"
                  size={20}
                  color={theme.colors.textInverse}
                />
              </LinearGradient>
            </Pressable>
          </Animated.View>

          <View style={{ height: 12 }} />

          <TText style={[styles.disclaimer, { color: theme.colors.textMuted }]}>
            {t("welcome.disclaimer")}
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
    paddingTop: 56,
    paddingHorizontal: 32,
  },
  iconBubble: {
    width: 104,
    height: 104,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headline: {
    fontSize: 30,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  subheadline: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 23,
  },
  valueList: {
    paddingHorizontal: 24,
    gap: 10,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    gap: 14,
  },
  valueIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  valueText: { flex: 1 },
  valueTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  valueSub: {
    fontSize: 13,
    marginTop: 3,
    lineHeight: 18,
  },
  ctaArea: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  ctaShadow: {
    position: "absolute",
    bottom: -4,
    left: 16,
    right: 16,
    height: 48,
    borderRadius: 20,
  },
  ctaGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    borderRadius: 16,
    gap: 8,
    width: "100%",
  },
  ctaText: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  disclaimer: {
    fontSize: 13,
    textAlign: "center",
  },
});
