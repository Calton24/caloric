/**
 * Toast
 * Feedback overlay. Slides in from the bottom.
 * By default auto-dismisses after 2.5 s. Pass `persistent: true`
 * to keep it visible until explicitly dismissed.
 *
 * Usage:
 *   const toast = useToast();
 *   toast.show("Saved!", "success");
 *   toast.show("Offline", "warning", { persistent: true });
 *   toast.dismiss();
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

interface ToastOptions {
  /** When true the toast stays visible until dismiss() is called. */
  persistent?: boolean;
}

interface ToastState {
  message: string;
  variant: ToastVariant;
  id: number;
  persistent: boolean;
}

interface ToastContextValue {
  show: (
    message: string,
    variant?: ToastVariant,
    options?: ToastOptions
  ) => void;
  /** Programmatically dismiss the current toast (including persistent ones). */
  dismiss: () => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const TOAST_DURATION = 2500;
const ANIMATION_DURATION = 300;

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
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idRef = useRef(0);

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 100,
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
    (
      message: string,
      variant: ToastVariant = "info",
      options?: ToastOptions
    ) => {
      const persistent = options?.persistent ?? false;

      // Clear any pending timeout
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      const id = ++idRef.current;
      setToast({ message, variant, id, persistent });

      // Reset + animate in from bottom
      translateY.setValue(100);
      opacity.setValue(0);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 18,
          stiffness: 200,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
      ]).start();

      // Persistent toasts stay until dismiss() is called
      if (!persistent) {
        timeoutRef.current = setTimeout(() => dismiss(), TOAST_DURATION);
      }
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
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toastContainer,
            {
              bottom: insets.bottom + 80,
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
                borderRadius: theme.radius.xl,
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
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  toastText: {
    flex: 1,
    marginLeft: 10,
  },
});
