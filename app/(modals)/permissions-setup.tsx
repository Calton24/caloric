/**
 * Permissions Required Screen
 *
 * Shown after onboarding completes.
 * Requests microphone and speech recognition permissions
 * needed for voice logging.
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
} from "react-native-reanimated";
import {
    requestMicrophonePermission,
    requestSpeechRecognitionPermission,
    requestVoicePermissions,
    usePermissionsStore,
} from "../../src/features/permissions";
import { scheduleMealReminders } from "../../src/features/reminders/meal-reminders.service";
import { useSettingsStore } from "../../src/features/settings/settings.store";
import { useAppTranslation } from "../../src/infrastructure/i18n/useAppTranslation";
import { notifications } from "../../src/infrastructure/notifications/notifications";
import { useTheme } from "../../src/theme/useTheme";
import { PermissionRow } from "../../src/ui/components/PermissionRow";
import { ScreenContainer } from "../../src/ui/components/ScreenContainer";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";

export default function PermissionsScreen() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const router = useRouter();
  const { source } = useLocalSearchParams<{ source?: string }>();

  // When opened from voice-log, go back instead of forward to live-activity-intro
  const isFromVoiceLog = source === "voice-log";

  // Read live permission state from the global store
  const mic = usePermissionsStore((s) => s.permissions.microphone);
  const speech = usePermissionsStore((s) => s.permissions.speechRecognition);
  const notifs = usePermissionsStore((s) => s.permissions.notifications);

  const allGranted =
    mic === "granted" && speech === "granted" && notifs === "granted";

  // Auto-navigate back when both permissions are granted and we came from voice-log.
  // This eliminates the need to manually tap "Continue" after granting.
  const hasAutoNavigated = useRef(false);
  useEffect(() => {
    if (isFromVoiceLog && allGranted && !hasAutoNavigated.current) {
      hasAutoNavigated.current = true;
      router.back();
    }
  }, [isFromVoiceLog, allGranted, router]);

  const handleMic = async () => {
    await requestMicrophonePermission();
  };

  const handleSpeech = async () => {
    await requestSpeechRecognitionPermission();
  };

  const handleNotifications = async () => {
    const status = await notifications.requestPermissions();
    usePermissionsStore
      .getState()
      .setPermission(
        "notifications",
        status === "granted" ? "granted" : "denied"
      );
    if (status === "granted") {
      useSettingsStore.getState().setLogReminderEnabled(true);
      scheduleMealReminders().catch(() => {});
    }
  };

  const handleContinue = async () => {
    if (!allGranted) {
      // Actually request both permissions before navigating
      const result = await requestVoicePermissions();
      if (!result.granted) {
        // User denied — stay on screen so they can see status
        return;
      }
    }
    // Mark permissions as seen so we don't redirect here again
    useSettingsStore.getState().setHasSeenPermissions(true);
    // All granted now — navigate
    if (isFromVoiceLog) {
      router.back();
    } else if (Platform.OS === "ios") {
      router.replace("/(modals)/live-activity-intro" as any);
    } else {
      router.replace("/(main)/home" as any);
    }
  };

  const handleSkip = () => {
    // Mark permissions as seen so we don't redirect here again
    useSettingsStore.getState().setHasSeenPermissions(true);
    if (isFromVoiceLog) {
      router.back();
    } else if (Platform.OS === "ios") {
      router.replace("/(modals)/live-activity-intro" as any);
    } else {
      router.replace("/(main)/home" as any);
    }
  };

  return (
    <ScreenContainer scrollable={false} edges={["top", "bottom"]}>
      <View style={styles.content}>
        {/* Hand icon */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(100)}
          style={styles.iconSection}
        >
          <View
            style={[
              styles.iconBubble,
              { backgroundColor: theme.colors.primary + "1A" },
            ]}
          >
            <Ionicons name="hand-left" size={48} color={theme.colors.primary} />
          </View>
        </Animated.View>

        <TSpacer size="lg" />

        <Animated.View entering={FadeIn.duration(500).delay(200)}>
          <TText
            variant="heading"
            style={[styles.title, { color: theme.colors.text }]}
          >
            {t("permissionsSetup.title")}
          </TText>
          <TSpacer size="sm" />
          <TText
            style={[styles.subtitle, { color: theme.colors.textSecondary }]}
          >
            {t("permissionsSetup.subtitle")}
          </TText>
        </Animated.View>

        <TSpacer size="xl" />

        {/* Permission rows */}
        <Animated.View
          entering={FadeInUp.duration(500).delay(350)}
          style={styles.rows}
        >
          <PermissionRow
            icon="mic"
            label={t("permissionsSetup.microphone")}
            description={t("permissionsSetup.microphoneDesc")}
            status={mic}
            onPress={handleMic}
          />
          <TSpacer size="sm" />
          <PermissionRow
            icon="chatbubble-ellipses"
            label={t("permissionsSetup.speechRecognition")}
            description={t("permissionsSetup.speechRecognitionDesc")}
            status={speech}
            onPress={handleSpeech}
          />
          <TSpacer size="sm" />
          <PermissionRow
            icon="notifications"
            label={t("permissionsSetup.pushNotifications")}
            description={t("permissionsSetup.pushNotificationsDesc")}
            status={notifs}
            onPress={handleNotifications}
          />
        </Animated.View>
      </View>

      {/* Bottom CTA */}
      <Animated.View
        entering={FadeInUp.duration(500).delay(500)}
        style={styles.bottom}
      >
        <Pressable
          onPress={handleContinue}
          style={({ pressed }) => [
            styles.ctaButton,
            { opacity: pressed ? 0.9 : 1 },
          ]}
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
              {allGranted
                ? t("permissionsSetup.continue")
                : t("permissionsSetup.grantPermissions")}
            </TText>
          </LinearGradient>
        </Pressable>

        <TSpacer size="sm" />

        {!allGranted && (
          <Pressable onPress={handleSkip} hitSlop={12}>
            <TText style={[styles.skipText, { color: theme.colors.textMuted }]}>
              {t("permissionsSetup.skipForNow")}
            </TText>
          </Pressable>
        )}
      </Animated.View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingTop: 40,
  },
  iconSection: {
    alignItems: "center",
  },
  iconBubble: {
    width: 100,
    height: 100,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  rows: {
    gap: 0,
  },
  bottom: {
    alignItems: "center",
    paddingBottom: 16,
  },
  ctaButton: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
  },
  ctaGradient: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: "700",
  },
  skipText: {
    fontSize: 15,
    fontWeight: "500",
    paddingVertical: 8,
  },
});
