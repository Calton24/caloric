/**
 * Consent Modal
 *
 * First-launch privacy consent dialog shown after onboarding.
 * Required for GDPR, CCPA, and App Store compliance.
 *
 * Allows users to:
 * - Accept/decline analytics
 * - Accept/decline cross-app tracking (iOS ATT)
 * - Accept/decline marketing
 * - Accept/decline crash reporting
 *
 * Flow:
 * - Shown once after onboarding completion
 * - User can change preferences later in Settings
 * - If declined, analytics/tracking are disabled
 */

import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Switch,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../theme/useTheme";
import { TButton } from "../../ui/primitives/TButton";
import { TSpacer } from "../../ui/primitives/TSpacer";
import { TText } from "../../ui/primitives/TText";
import { getDefaultConsent, saveUserConsent } from "./consent.service";
import { requestTrackingPermission } from "./tracking.service";

interface ConsentModalProps {
  visible: boolean;
  onComplete: () => void;
}

export function ConsentModal({ visible, onComplete }: ConsentModalProps) {
  const { theme } = useTheme();
  const [consent, setConsent] = useState(getDefaultConsent());
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);

    try {
      // Save consent preferences
      await saveUserConsent(consent);

      // If tracking consent is granted, request iOS ATT permission
      if (consent.tracking) {
        const status = await requestTrackingPermission();
        if (status !== "granted") {
          // User denied ATT, update consent to reflect actual permission
          setConsent((prev) => ({ ...prev, tracking: false }));
          await saveUserConsent({ ...consent, tracking: false });
        }
      }

      onComplete();
    } catch (error) {
      console.error("[ConsentModal] Failed to save consent:", error);
      Alert.alert("Error", "Failed to save preferences. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptAll = async () => {
    setConsent({
      analytics: true,
      tracking: true,
      marketing: true,
      crashReporting: true,
    });

    // Auto-save after accepting all
    setLoading(true);
    await saveUserConsent({
      analytics: true,
      tracking: true,
      marketing: true,
      crashReporting: true,
    });

    // Request ATT permission
    await requestTrackingPermission();

    setLoading(false);
    onComplete();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons
                name="shield-checkmark"
                size={32}
                color={theme.colors.primary}
              />
            </View>
            <TText
              variant="heading"
              style={[styles.title, { color: theme.colors.text }]}
            >
              Your Privacy Matters
            </TText>
            <TText
              style={[styles.subtitle, { color: theme.colors.textSecondary }]}
            >
              We respect your privacy. Choose what data you&apos;re comfortable
              sharing with us.
            </TText>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Analytics */}
            <ConsentOption
              icon="analytics-outline"
              iconColor={theme.colors.primary}
              title="Product Analytics"
              description="Help us improve Caloric by sharing anonymous usage data. No personal information is collected."
              value={consent.analytics}
              onToggle={(value) =>
                setConsent((prev) => ({ ...prev, analytics: value }))
              }
            />

            <TSpacer size="md" />

            {/* Tracking (iOS ATT) */}
            <ConsentOption
              icon="eye-outline"
              iconColor={theme.colors.info}
              title="Cross-App Tracking"
              description="Allow Caloric to track your activity across other apps and websites for personalized ads."
              value={consent.tracking}
              onToggle={(value) =>
                setConsent((prev) => ({ ...prev, tracking: value }))
              }
            />

            <TSpacer size="md" />

            {/* Marketing */}
            <ConsentOption
              icon="mail-outline"
              iconColor={theme.colors.accent}
              title="Marketing Communications"
              description="Receive tips, recipes, and special offers via email. You can unsubscribe anytime."
              value={consent.marketing}
              onToggle={(value) =>
                setConsent((prev) => ({ ...prev, marketing: value }))
              }
            />

            <TSpacer size="md" />

            {/* Crash Reporting */}
            <ConsentOption
              icon="bug-outline"
              iconColor={theme.colors.error}
              title="Crash Reporting"
              description="Automatically send crash reports to help us fix bugs and improve stability."
              value={consent.crashReporting}
              onToggle={(value) =>
                setConsent((prev) => ({ ...prev, crashReporting: value }))
              }
            />

            <TSpacer size="lg" />

            {/* Footer Note */}
            <TText
              style={[styles.footerNote, { color: theme.colors.textMuted }]}
            >
              You can change these preferences anytime in Settings. For more
              details, see our{" "}
              <TText
                style={{
                  color: theme.colors.primary,
                  textDecorationLine: "underline",
                }}
              >
                Privacy Policy
              </TText>
              .
            </TText>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footer}>
            <TButton
              variant="primary"
              onPress={handleAcceptAll}
              disabled={loading}
              style={styles.button}
            >
              {loading ? "Saving..." : "Accept All"}
            </TButton>
            <TSpacer size="sm" />
            <TButton
              variant="secondary"
              onPress={handleSave}
              disabled={loading}
              style={styles.button}
            >
              Save Preferences
            </TButton>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// Individual consent option row
interface ConsentOptionProps {
  icon: string;
  iconColor: string;
  title: string;
  description: string;
  value: boolean;
  onToggle: (value: boolean) => void;
}

function ConsentOption({
  icon,
  iconColor,
  title,
  description,
  value,
  onToggle,
}: ConsentOptionProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.option,
        { backgroundColor: theme.colors.surfaceSecondary },
      ]}
    >
      <View style={[styles.optionIcon, { backgroundColor: iconColor + "22" }]}>
        <Ionicons name={icon as any} size={24} color={iconColor} />
      </View>
      <View style={styles.optionContent}>
        <TText style={[styles.optionTitle, { color: theme.colors.text }]}>
          {title}
        </TText>
        <TText
          style={[
            styles.optionDescription,
            { color: theme.colors.textSecondary },
          ]}
        >
          {description}
        </TText>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{
          false: theme.colors.border,
          true: theme.colors.primary + "88",
        }}
        thumbColor={value ? theme.colors.primary : theme.colors.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: "center",
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#6366F122",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  footerNote: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  button: {
    width: "100%",
  },
});
