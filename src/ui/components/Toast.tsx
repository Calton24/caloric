/**
 * Toast
 * Ephemeral feedback overlay. Shows a message briefly then auto-dismisses.
 *
 * Usage:
 *   const toast = useToast();
 *   toast.show("Saved!", "success");
 *
 * Mount <ToastProvider> at app root (inside ThemeProvider).
 */

import { Ionicons } from "@expo/vector-icons";
import React, {
    createContext,
    useCallback,
    useContext,
    useRef,
    useState,
} from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";

type ToastVariant = "success" | "error" | "info" | "warning";

interface ToastState {
  message: string;
  variant: ToastVariant;
  id: number;
}

interface ToastContextValue {
  show: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const TOAST_DURATION = 2500;
const ANIMATION_DURATION = 250;

const variantIcons: Record<ToastVariant, keyof typeof Ionicons.glyphMap> = {
  success: "checkmark-circle",
  error: "alert-circle",
  info: "information-circle",
  warning: "warning",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState | null>(null);
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idRef = useRef(0);

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start(() => setToast(null));
  }, [translateY, opacity]);

  const show = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      // Clear any pending timeout
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      const id = ++idRef.current;
      setToast({ message, variant, id });

      // Reset + animate in
      translateY.setValue(-100);
      opacity.setValue(0);

      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
      ]).start();

      timeoutRef.current = setTimeout(() => dismiss(), TOAST_DURATION);
    },
    [translateY, opacity, dismiss]
  );

  const colorForVariant = (v: ToastVariant) => {
    switch (v) {
      case "success":
        return theme.colors.success;
      case "error":
        return theme.colors.error;
      case "warning":
        return theme.colors.warning;
      case "info":
      default:
        return theme.colors.info;
    }
  };

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toastContainer,
            {
              top: insets.top + 8,
              transform: [{ translateY }],
              opacity,
            },
          ]}
        >
          <View
            style={[
              styles.toast,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderRadius: theme.radius.lg,
                borderLeftColor: colorForVariant(toast.variant),
                borderLeftWidth: 4,
                paddingVertical: theme.spacing.md,
                paddingHorizontal: theme.spacing.md,
              },
            ]}
          >
            <Ionicons
              name={variantIcons[toast.variant]}
              size={20}
              color={colorForVariant(toast.variant)}
            />
            <TText style={styles.toastText} numberOfLines={2}>
              {toast.message}
            </TText>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within <ToastProvider>");
  }
  return ctx;
}

const styles = StyleSheet.create({
  toastContainer: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: "center",
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  toastText: {
    flex: 1,
    marginLeft: 10,
  },
});
