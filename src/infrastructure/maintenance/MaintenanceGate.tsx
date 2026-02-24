/**
 * MaintenanceGate
 *
 * Wraps the app to display maintenance overlays based on the current
 * maintenance state. Must be placed inside ThemeProvider but outside
 * feature providers.
 *
 * Modes:
 *   "normal"      — renders children as-is
 *   "degraded"    — renders a dismissible warning banner above children
 *   "read_only"   — renders an info banner + provides context for features
 *   "maintenance"  — full-screen overlay with retry, children are NOT rendered
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
    ActivityIndicator,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { maintenance } from "./maintenance";
import { DEFAULT_MAINTENANCE_STATE, type MaintenanceState } from "./types";

// ── Context ─────────────────────────────────────────────────────────────────

interface MaintenanceContextValue {
  state: MaintenanceState;
  /** Check whether a specific feature is blocked */
  isFeatureBlocked: (feature: string) => boolean;
}

const MaintenanceContext = createContext<MaintenanceContextValue>({
  state: DEFAULT_MAINTENANCE_STATE,
  isFeatureBlocked: () => false,
});

/** Use in feature code to check maintenance state */
export function useMaintenanceState(): MaintenanceContextValue {
  return useContext(MaintenanceContext);
}

// ── Component ───────────────────────────────────────────────────────────────

interface MaintenanceGateProps {
  children: React.ReactNode;
  /** Override poll interval in ms (default: 60 000) */
  pollInterval?: number;
}

export function MaintenanceGate({
  children,
  pollInterval = 60_000,
}: MaintenanceGateProps) {
  const [state, setState] = useState<MaintenanceState>(
    DEFAULT_MAINTENANCE_STATE
  );
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const prevMode = useRef(state.mode);

  // Fetch maintenance state on mount + poll + subscribe to proxy changes
  const fetchState = useCallback(async () => {
    try {
      const s = await maintenance.getState();
      setState(s);
    } catch {
      // Never crash — keep current state
    }
  }, []);

  useEffect(() => {
    void fetchState();
    const interval = setInterval(fetchState, pollInterval);

    // Subscribe to push-based changes (outage monitor, local override)
    const unsub = maintenance.subscribe((s) => {
      setState(s);
    });

    return () => {
      clearInterval(interval);
      unsub();
    };
  }, [fetchState, pollInterval]);

  // Reset banner dismissal when mode changes
  useEffect(() => {
    if (prevMode.current !== state.mode) {
      setBannerDismissed(false);
      prevMode.current = state.mode;
    }
  }, [state.mode]);

  const handleRetry = useCallback(async () => {
    setRetrying(true);
    await fetchState();
    setRetrying(false);
  }, [fetchState]);

  const isFeatureBlocked = useCallback(
    (feature: string): boolean => {
      return maintenance.isBlocked(feature);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state]
  );

  const contextValue: MaintenanceContextValue = { state, isFeatureBlocked };

  // ── Full-screen maintenance overlay ─────────────────────────────────────
  if (state.mode === "maintenance") {
    return (
      <MaintenanceContext.Provider value={contextValue}>
        <View style={styles.fullScreen} testID="maintenance-overlay">
          <Text style={styles.icon}>🔧</Text>
          <Text style={styles.title}>Under Maintenance</Text>
          <Text style={styles.message}>
            {state.message ??
              "We're making improvements. Please check back shortly."}
          </Text>
          {state.until && (
            <Text style={styles.until}>
              Expected back: {new Date(state.until).toLocaleString()}
            </Text>
          )}
          <Pressable
            style={styles.retryButton}
            onPress={handleRetry}
            disabled={retrying}
            testID="maintenance-retry"
          >
            {retrying ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.retryText}>Retry</Text>
            )}
          </Pressable>
        </View>
      </MaintenanceContext.Provider>
    );
  }

  // ── Normal / degraded / read_only — render children with optional banner ──
  const showBanner =
    (state.mode === "degraded" || state.mode === "read_only") &&
    !bannerDismissed;

  return (
    <MaintenanceContext.Provider value={contextValue}>
      {showBanner && (
        <View
          style={[
            styles.banner,
            state.mode === "read_only"
              ? styles.bannerReadOnly
              : styles.bannerDegraded,
          ]}
          testID="maintenance-banner"
        >
          <Text style={styles.bannerText} numberOfLines={2}>
            {state.mode === "read_only" ? "🔒 " : "⚠️ "}
            {state.message ??
              (state.mode === "degraded"
                ? "Some features may be temporarily unavailable."
                : "App is in read-only mode.")}
          </Text>
          <Pressable
            onPress={() => setBannerDismissed(true)}
            hitSlop={8}
            testID="maintenance-banner-dismiss"
          >
            <Text style={styles.bannerDismiss}>✕</Text>
          </Pressable>
        </View>
      )}
      {children}
    </MaintenanceContext.Provider>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#151718",
    paddingHorizontal: 32,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#ECEDEE",
    marginBottom: 8,
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "system-ui" : undefined,
  },
  message: {
    fontSize: 15,
    color: "#9BA1A6",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 8,
  },
  until: {
    fontSize: 13,
    color: "#687076",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#2A2D2F",
    minWidth: 120,
    alignItems: "center",
  },
  retryText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ECEDEE",
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
  },
  bannerDegraded: {
    backgroundColor: "#3D2E00",
  },
  bannerReadOnly: {
    backgroundColor: "#1A2333",
  },
  bannerText: {
    flex: 1,
    fontSize: 13,
    color: "#ECEDEE",
    lineHeight: 18,
  },
  bannerDismiss: {
    fontSize: 16,
    color: "#9BA1A6",
    paddingLeft: 12,
  },
});
