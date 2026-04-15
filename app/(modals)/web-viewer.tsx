/**
 * Web Viewer Modal
 *
 * Native in-app WebView for displaying internal web pages
 * (Privacy Policy, Terms of Service, etc.) without leaving the app.
 */

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
    ActivityIndicator,
    Platform,
    Pressable,
    StyleSheet,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { useTheme } from "../../src/theme/useTheme";
import { TText } from "../../src/ui/primitives/TText";

export default function WebViewerModal() {
  const { url, title } = useLocalSearchParams<{ url: string; title: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);

  const decodedUrl = url ? decodeURIComponent(url) : "";
  const decodedTitle = title ? decodeURIComponent(title) : "Loading...";

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
              router.back();
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
          style={[styles.webView, { backgroundColor: theme.colors.background }]}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onNavigationStateChange={(state) => setCanGoBack(state.canGoBack)}
          allowsBackForwardNavigationGestures={Platform.OS === "ios"}
          startInLoadingState={false}
          // Security: block mixed content and restrict navigation to same host
          mixedContentMode="never"
        />

        {loading && (
          <View
            style={[
              styles.loadingOverlay,
              { backgroundColor: theme.colors.background },
            ]}
          >
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
});
