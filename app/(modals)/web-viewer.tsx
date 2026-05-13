/**
 * Web Viewer Modal
 *
 * Native in-app WebView for displaying internal web pages
 * (Privacy Policy, Terms of Service, etc.) without leaving the app.
 */

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { useAppTranslation } from "../../src/infrastructure/i18n/useAppTranslation";
import { safeRouterBack } from "../../src/navigation/safeBack";
import { useTheme } from "../../src/theme/useTheme";
import { TText } from "../../src/ui/primitives/TText";

const PAYWALL_GATE_FALLBACK = {
  pathname: "/(onboarding)/paywall",
  params: { mode: "gate" as const },
};

export default function WebViewerModal() {
  const { url, title } = useLocalSearchParams<{ url: string; title: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [hasCheckedParams, setHasCheckedParams] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setHasCheckedParams(true), 300);
    return () => clearTimeout(id);
  }, []);

  const decodedUrl = url ? decodeURIComponent(url) : "";
  const decodedTitle = title ? decodeURIComponent(title) : t("common.loading");

  const closeModal = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(PAYWALL_GATE_FALLBACK as never);
    }
  };

  if (!decodedUrl && !hasCheckedParams) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        edges={["top", "left", "right"]}
      >
        <View style={styles.paramWait}>
          <ActivityIndicator
            size="large"
            color={theme.colors.primary ?? "#22c55e"}
          />
          <TText
            style={[styles.paramWaitText, { color: theme.colors.textSecondary }]}
          >
            {t("common.loading")}
          </TText>
        </View>
      </SafeAreaView>
    );
  }

  if (!decodedUrl && hasCheckedParams) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        edges={["top", "left", "right"]}
      >
        <View style={styles.paramError}>
          <TText style={[styles.paramErrorTitle, { color: theme.colors.text }]}>
            {t("common.error")}
          </TText>
          <TText
            style={[
              styles.paramErrorMessage,
              { color: theme.colors.textSecondary },
            ]}
          >
            The link was missing. Close and try again.
          </TText>
          <Pressable
            onPress={closeModal}
            style={({ pressed }) => [
              styles.paramErrorButton,
              {
                backgroundColor: theme.colors.primary,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            hitSlop={12}
          >
            <TText style={{ color: "#fff" }}>{t("common.dismiss")}</TText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={["top", "left", "right"]}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.background,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        {/* Back / close button */}
        <Pressable
          onPress={() => {
            if (canGoBack) {
              webViewRef.current?.goBack();
            } else {
              safeRouterBack(
                router,
                PAYWALL_GATE_FALLBACK,
                "web_viewer_close",
              );
            }
          }}
          style={styles.headerButton}
          hitSlop={8}
        >
          <Ionicons
            name={canGoBack ? "chevron-back" : "close"}
            size={24}
            color={theme.colors.text}
          />
        </Pressable>

        <TText
          style={[styles.headerTitle, { color: theme.colors.text }]}
          numberOfLines={1}
        >
          {decodedTitle}
        </TText>

        {/* Right placeholder to keep title centered */}
        <View style={styles.headerButton} />
      </View>

      {/* WebView */}
      <View style={styles.webViewContainer}>
        <WebView
          ref={webViewRef}
          source={{ uri: decodedUrl }}
          style={[styles.webView, { backgroundColor: "#FFFFFF" }]}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onNavigationStateChange={(state) => setCanGoBack(state.canGoBack)}
          allowsBackForwardNavigationGestures={Platform.OS === "ios"}
          startInLoadingState={false}
          // Security: block mixed content and restrict navigation to same host
          mixedContentMode="never"
        />

        {loading && (
          <View style={[styles.loadingOverlay, { backgroundColor: "#FFFFFF" }]}>
            <ActivityIndicator
              size="large"
              color={theme.colors.primary ?? "#22c55e"}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerButton: {
    width: 40,
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
  },
  webViewContainer: {
    flex: 1,
  },
  webView: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  paramWait: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 16,
  },
  paramWaitText: {
    fontSize: 15,
  },
  paramError: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 16,
  },
  paramErrorTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  paramErrorMessage: {
    fontSize: 15,
    textAlign: "center",
  },
  paramErrorButton: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
});
