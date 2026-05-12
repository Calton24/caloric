import { FeatureFlags } from "@/config/features";
import { useAuth } from "@/src/features/auth/useAuth";
import { useLiveActivitySync } from "@/src/features/live-activity";
import { haptics } from "@/src/infrastructure/haptics";
import { useAppTranslation } from "@/src/infrastructure/i18n";
import { useTheme } from "@/src/theme/useTheme";
import { GlassTabBar } from "@/src/ui/tabs/GlassTabBar";
import { Icon, Label, Redirect, Slot, Tabs, usePathname } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { Platform, View } from "react-native";
import "react-native-reanimated";
import {
  isPostFoodLogSettling,
  subscribePostFoodLogSettling,
} from "@/src/features/food-logging/post-food-log-settling";

/**
 * iOS 26+ gets liquid-glass NativeTabs.
 * Everything else (iOS < 26, Android) gets our custom GlassTabBar.
 */
const IOS_VERSION = Number(Platform.Version);
const USE_NATIVE_TABS = Platform.OS === "ios" && IOS_VERSION >= 26;

// ─── Shared tab definitions ───────────────────────────────────
const TABS = [
  {
    name: "index",
    flag: FeatureFlags.SHOW_HOME,
    labelKey: "tabs.home",
    sf: "house.fill",
    ionicon: "home",
  },
] as const;

/**
 * Fires haptics on tab changes by watching the current pathname.
 * Works for both NativeTabs (iOS 26+) and GlassTabBar since
 * usePathname() is global to the expo-router.
 */
function useTabChangeHaptics() {
  const pathname = usePathname();
  const prevPathname = useRef<string | null>(null);
  const settling = useSyncExternalStore(
    subscribePostFoodLogSettling,
    isPostFoodLogSettling,
    () => false
  );

  useEffect(() => {
    if (prevPathname.current !== null && pathname !== prevPathname.current) {
      if (!settling) {
        haptics.impact("light");
      }
    }
    prevPathname.current = pathname;
  }, [pathname, settling]);
}

// ─── Native liquid-glass tabs (iOS 26+) ───────────────────────
function NativeTabLayout() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();

  // Use the app's own theme mode (not the device's useColorScheme)
  // so the wrapper background stays in sync with screen content.
  const screenBg = theme.colors.background;

  return (
    <View testID="tabs-root" style={{ flex: 1, backgroundColor: screenBg }}>
      <NativeTabs>
        {TABS.filter((t) => t.flag).map((tab) => (
          <NativeTabs.Trigger key={tab.name} name={tab.name}>
            <Icon sf={tab.sf} />
            <Label>{t(tab.labelKey)}</Label>
          </NativeTabs.Trigger>
        ))}
      </NativeTabs>
    </View>
  );
}

// ─── Custom glass pill tabs (iOS < 26 & Android) ─────────────
function GlassTabLayout() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  return (
    <View
      testID="tabs-root"
      style={{ flex: 1, backgroundColor: theme.colors.background }}
    >
      <Tabs
        tabBar={(props) => <GlassTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          lazy: true,
          sceneStyle: { backgroundColor: theme.colors.background },
        }}
      >
        {TABS.map((tab) => (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: t(tab.labelKey),
              href: tab.flag ? undefined : null, // null hides the tab
            }}
          />
        ))}
      </Tabs>
    </View>
  );
}

export default function TabLayout() {
  const { user, isLoading } = useAuth();
  const { theme } = useTheme();
  useLiveActivitySync();
  useTabChangeHaptics();

  // Auth guard — redirect unauthenticated users back to the entry point.
  // This handles sign-out, session expiry, and any accidental direct navigation.
  if (isLoading) return null;
  if (!user) return <Redirect href="/(onboarding)/landing" />;

  // Launch mode: single-screen app with no bottom tabs.
  // Keep this flag true for v1; set false in v2 to re-enable tabs.
  if (FeatureFlags.SINGLE_SCREEN_LAUNCH) {
    return (
      <View
        testID="tabs-root"
        style={{ flex: 1, backgroundColor: theme.colors.background }}
      >
        <Slot />
      </View>
    );
  }

  return USE_NATIVE_TABS ? <NativeTabLayout /> : <GlassTabLayout />;
}
