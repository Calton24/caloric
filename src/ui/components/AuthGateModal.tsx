/**
 * AuthGateModal — Styled modal prompting account creation at value moments
 *
 * Replaces the plain Alert.alert() in useAccountGate with a branded modal
 * that matches the app's design language. Shown when an unauthenticated
 * user tries to do something that requires an account (scan, save, upgrade).
 */

import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useTheme } from "../../theme/useTheme";
import { TSpacer } from "../primitives/TSpacer";
import { TText } from "../primitives/TText";

export type AuthGateReason = "meal_save" | "scan" | "upgrade" | "export";

interface AuthGateModalProps {
  visible: boolean;
  onDismiss: () => void;
  reason: AuthGateReason;
}

const GATE_CONTENT: Record<
  AuthGateReason,
  {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    description: string;
    cta: string;
  }
> = {
  meal_save: {
    icon: "bookmark-outline",
    title: "Save Your Meals",
    description:
      "Create a free account to save your meals and track your nutrition over time.",
    cta: "Create Free Account",
  },
  scan: {
    icon: "scan-outline",
    title: "Unlock AI Scanning",
    description:
      "Sign up for free to use AI-powered food scanning. You'll get 3 free scans to try it out.",
    cta: "Sign Up & Scan",
  },
  upgrade: {
    icon: "star-outline",
    title: "Upgrade to Pro",
    description:
      "Create an account to manage your subscription and unlock all premium features.",
    cta: "Sign Up to Upgrade",
  },
  export: {
    icon: "download-outline",
    title: "Export Your Data",
    description:
      "Sign up to export your nutrition history and share it with your coach.",
    cta: "Sign Up to Export",
  },
};

export function AuthGateModal({
  visible,
  onDismiss,
  reason,
}: AuthGateModalProps) {
  const { theme } = useTheme();
  const content = GATE_CONTENT[reason];

  const handleSignUp = () => {
    onDismiss();
    router.push("/auth/sign-in");
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <Animated.View
          entering={FadeIn.duration(200)}
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.background,
              shadowColor: theme.colors.text,
            },
          ]}
        >
          {/* Icon */}
          <Animated.View entering={FadeInDown.duration(400).delay(100)}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: theme.colors.primary + "15" },
              ]}
            >
              <Ionicons
                name={content.icon}
                size={32}
                color={theme.colors.primary}
              />
            </View>
          </Animated.View>

          <TSpacer size="md" />

          {/* Title & description */}
          <TText
            variant="heading"
            style={[styles.title, { color: theme.colors.text }]}
          >
            {content.title}
          </TText>

          <TSpacer size="xs" />

          <TText
            style={[styles.description, { color: theme.colors.textSecondary }]}
          >
            {content.description}
          </TText>

          <TSpacer size="lg" />

          {/* CTA button */}
          <Pressable
            onPress={handleSignUp}
            style={[
              styles.ctaButton,
              { backgroundColor: theme.colors.primary },
            ]}
          >
            <TText style={styles.ctaText}>{content.cta}</TText>
          </Pressable>

          <TSpacer size="sm" />

          {/* Dismiss */}
          <Pressable onPress={onDismiss} style={styles.dismissButton}>
            <TText
              style={[styles.dismissText, { color: theme.colors.textMuted }]}
            >
              Not now
            </TText>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  card: {
    width: "100%",
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: "center",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  ctaButton: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  ctaText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  dismissButton: {
    paddingVertical: 8,
  },
  dismissText: {
    fontSize: 15,
  },
});
