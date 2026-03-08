import { FeatureFlags } from "@/config/features";
import { haptics } from "@/src/infrastructure/haptics";
import { useTheme } from "@/src/theme/useTheme";
import { GlassTabBar } from "@/src/ui/tabs/GlassTabBar";
import { Tabs, usePathname } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { useEffect, useRef } from "react";
import { Platform, View } from "react-native";
import "react-native-reanimated";

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
    label: "Home",
    sf: "house.fill",
    ionicon: "home",
  },
  {
    name: "notes",
    flag: FeatureFlags.SHOW_NOTES,
    label: "Notes",
    sf: "note.text",
    ionicon: "document-text",
  },
  {
    name: "auth",
    flag: FeatureFlags.SHOW_AUTH,
    label: "Auth",
    sf: "person.circle.fill",
    ionicon: "person-circle",
  },
  {
    name: "playground",
    flag: FeatureFlags.SHOW_PLAYGROUND,
    label: "Playground",
    sf: "sparkles",
    ionicon: "sparkles",
  },
  {
    name: "caloric",
    flag: FeatureFlags.SHOW_CALORIC,
    label: "Caloric",
    sf: "hammer.fill",
    ionicon: "hammer",
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

  useEffect(() => {
    if (prevPathname.current !== null && pathname !== prevPathname.current) {
      haptics.impact("light");
    }
    prevPathname.current = pathname;
  }, [pathname]);
}

// ─── Native liquid-glass tabs (iOS 26+) ───────────────────────
function NativeTabLayout() {
  const { theme } = useTheme();
  useTabChangeHaptics();

  // Use the app's own theme mode (not the device's useColorScheme)
  // so the wrapper background stays in sync with screen content.
  const screenBg =
    theme.mode === "dark"
      ? "#000000" // iOS systemBackground (dark)
      : "#FFFFFF"; // iOS systemBackground (light)

  return (
    <View testID="tabs-root" style={{ flex: 1, backgroundColor: screenBg }}>
      <NativeTabs>
        {TABS.filter((t) => t.flag).map((t) => (
          <NativeTabs.Trigger key={t.name} name={t.name}>
            <Icon sf={t.sf} />
            <Label>{t.label}</Label>
          </NativeTabs.Trigger>
        ))}
      </NativeTabs>
    </View>
  );
}

// ─── Custom glass pill tabs (iOS < 26 & Android) ─────────────
function GlassTabLayout() {
  return (
    <View testID="tabs-root" style={{ flex: 1 }}>
      <Tabs
        tabBar={(props) => <GlassTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        {TABS.map((t) => (
          <Tabs.Screen
            key={t.name}
            name={t.name}
            options={{
              title: t.label,
              href: t.flag ? undefined : null, // null hides the tab
            }}
          />
        ))}
      </Tabs>
    </View>
  );
}

export default function TabLayout() {
  return USE_NATIVE_TABS ? <NativeTabLayout /> : <GlassTabLayout />;
}
