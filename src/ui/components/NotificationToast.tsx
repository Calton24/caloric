/**
 * NotificationToast
 * Push-notification-style banner that slides down from the top.
 * Use for in-app notifications (messages, alerts, updates).
 *
 * Usage:
 *   const notification = useNotificationToast();
 *   notification.show({ title: "New Message", body: "Hey!" });
 *
 * Mount <NotificationToastProvider> at app root (inside ThemeProvider).
 *
 * Features:
 * - Slides from top with spring physics
 * - Optional avatar/icon on left
 * - Title + body text
 * - Tap handler (navigate to content)
 * - Swipe up to dismiss
 * - Auto-dismiss after configurable duration
 * - Respects safe area insets
 */

import { Ionicons } from "@expo/vector-icons";
import React, {
    createContext,
    useCallback,
    useContext,
    useRef,
    useState,
} from "react";
import {
    Animated,
    PanResponder,
    Pressable,
    StyleSheet,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTranslation } from "../../infrastructure/i18n/useAppTranslation";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";

/* ── Types ─────────────────────────────────────────── */

type IconName = React.ComponentProps<typeof Ionicons>["name"];

export interface NotificationPayload {
  /** Notification title (bold) */
  title: string;
  /** Body text (optional) */
  body?: string;
  /** Ionicons icon name shown on the left (default: "notifications") */
  icon?: IconName;
  /** Image URI for avatar — takes priority over icon */
  avatarUri?: string;
  /** Called when the notification is tapped */
  onPress?: () => void;
  /** Auto-dismiss duration in ms (default: 4000, pass 0 to disable) */
  duration?: number;
}

interface NotificationState extends NotificationPayload {
  id: number;
}

interface NotificationToastContextValue {
  show: (payload: NotificationPayload) => void;
  dismiss: () => void;
}

const NotificationToastContext = createContext<
  NotificationToastContextValue | undefined
>(undefined);

/* ── Constants ─────────────────────────────────────── */

const DEFAULT_DURATION = 4000;
const ANIMATION_SPRING = { damping: 20, stiffness: 220, useNativeDriver: true };
const DISMISS_VELOCITY_THRESHOLD = -0.3; // swipe up speed to dismiss

/* ── Provider ──────────────────────────────────────── */

export function NotificationToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const insets = useSafeAreaInsets();
  const [notification, setNotification] = useState<NotificationState | null>(
    null
  );

  const translateY = useRef(new Animated.Value(-200)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idRef = useRef(0);

  const dismissAnimated = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -200,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => setNotification(null));
  }, [translateY, opacity]);

  const show = useCallback(
    (payload: NotificationPayload) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      const id = ++idRef.current;
      setNotification({ ...payload, id });

      // Reset position above screen
      translateY.setValue(-200);
      opacity.setValue(0);

      // Slide in from top
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, ...ANIMATION_SPRING }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const dur = payload.duration ?? DEFAULT_DURATION;
      if (dur > 0) {
        timeoutRef.current = setTimeout(() => dismissAnimated(), dur);
      }
    },
    [translateY, opacity, dismissAnimated]
  );

  // Swipe-up-to-dismiss gesture
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => gs.dy < -5,
      onPanResponderMove: (_, gs) => {
        if (gs.dy < 0) {
          translateY.setValue(gs.dy);
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.vy < DISMISS_VELOCITY_THRESHOLD || gs.dy < -40) {
          dismissAnimated();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            ...ANIMATION_SPRING,
          }).start();
        }
      },
    })
  ).current;

  const handlePress = useCallback(() => {
    if (notification?.onPress) {
      dismissAnimated();
      // Small delay so dismiss animation starts before navigation
      setTimeout(() => notification.onPress?.(), 100);
    }
  }, [notification, dismissAnimated]);

  const iconName = notification?.icon ?? "notifications";

  return (
    <NotificationToastContext.Provider
      value={{ show, dismiss: dismissAnimated }}
    >
      {children}
      {notification && (
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.container,
            {
              top: insets.top + 8,
              transform: [{ translateY }],
              opacity,
            },
          ]}
        >
          <Pressable
            onPress={handlePress}
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderRadius: theme.radius.xl,
                paddingVertical: theme.spacing.sm + 4,
                paddingHorizontal: theme.spacing.md,
              },
            ]}
          >
            {/* Left: avatar or icon */}
            {notification.avatarUri ? (
              <View
                style={[
                  styles.avatarContainer,
                  {
                    backgroundColor: theme.colors.surfaceSecondary,
                    borderRadius: theme.radius.lg,
                  },
                ]}
              >
                <Animated.Image
                  source={{ uri: notification.avatarUri }}
                  style={styles.avatar}
                />
              </View>
            ) : (
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: theme.colors.primary + "18",
                    borderRadius: theme.radius.lg,
                  },
                ]}
              >
                <Ionicons
                  name={iconName}
                  size={20}
                  color={theme.colors.primary}
                />
              </View>
            )}

            {/* Text content */}
            <View style={styles.textContainer}>
              <TText
                variant="body"
                numberOfLines={1}
                style={{
                  fontWeight: theme.typography.fontWeight.semibold,
                  fontSize: theme.typography.fontSize.sm,
                }}
              >
                {notification.title}
              </TText>
              {notification.body ? (
                <TText
                  variant="body"
                  color="secondary"
                  numberOfLines={2}
                  style={{ fontSize: theme.typography.fontSize.sm }}
                >
                  {notification.body}
                </TText>
              ) : null}
            </View>

            {/* Timestamp / pill indicator */}
            <View style={styles.trailing}>
              <TText variant="caption" color="muted">
                {t("common.now")}
              </TText>
            </View>
          </Pressable>
        </Animated.View>
      )}
    </NotificationToastContext.Provider>
  );
}

/* ── Hook ──────────────────────────────────────────── */

export function useNotificationToast(): NotificationToastContextValue {
  const ctx = useContext(NotificationToastContext);
  if (!ctx) {
    throw new Error(
      "useNotificationToast must be used within <NotificationToastProvider>"
    );
  }
  return ctx;
}

/* ── Styles ────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 10000,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 10,
  },
  iconContainer: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarContainer: {
    width: 36,
    height: 36,
    overflow: "hidden",
    marginRight: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    resizeMode: "cover",
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  trailing: {
    marginLeft: 8,
    alignItems: "flex-end",
  },
});
