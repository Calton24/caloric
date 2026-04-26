/**
 * Guide Modal
 *
 * Full-screen guide showing how to use the app's logging features.
 * Orange gradient header with lightbulb icon, scrollable list of
 * instructional items with icons, titles, and descriptions.
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTranslation } from "../../src/infrastructure/i18n/useAppTranslation";
import { useTheme } from "../../src/theme/useTheme";
import { TText } from "../../src/ui/primitives/TText";

/** Guide list items */
const GUIDE_ITEMS: {
  icon: keyof typeof Ionicons.glyphMap;
  titleKey: string;
  descKey: string;
}[] = [
  {
    icon: "camera-outline",
    titleKey: "guide.takePhoto",
    descKey: "guide.takePhotoDesc",
  },
  {
    icon: "barcode-outline",
    titleKey: "guide.scanBarcodes",
    descKey: "guide.scanBarcodesDesc",
  },
  {
    icon: "mic-outline",
    titleKey: "guide.speechRecognition",
    descKey: "guide.speechRecognitionDesc",
  },
  {
    icon: "keypad-outline",
    titleKey: "guide.textMode",
    descKey: "guide.textModeDesc",
  },
  {
    icon: "create-outline",
    titleKey: "guide.editingDetails",
    descKey: "guide.editingDetailsDesc",
  },
  {
    icon: "flame-outline",
    titleKey: "guide.trackingCalories",
    descKey: "guide.trackingCaloriesDesc",
  },
];

export default function GuideScreen() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const router = useRouter();

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* ── Orange gradient header ── */}
      <LinearGradient
        colors={["#FF8C00", "#FF6B00", "#E85D04"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <SafeAreaView edges={["top"]} style={styles.headerSafe}>
          {/* Close button */}
          <View style={styles.headerRow}>
            <View style={{ width: 36 }} />
            <View style={{ flex: 1 }} />
            <Pressable
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.dismiss();
                }
              }}
              hitSlop={12}
              style={({ pressed }) => [
                styles.headerClose,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Ionicons name="close" size={20} color="#000" />
            </Pressable>
          </View>

          {/* Icon + title */}
          <View style={styles.headerCenter}>
            <Ionicons
              name="bulb-outline"
              size={48}
              color="#FFF"
              style={styles.headerIcon}
            />
            <TText style={styles.headerTitle}>{t("guide.title")}</TText>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* ── Guide items list ── */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {GUIDE_ITEMS.map((item, index) => (
          <View key={item.titleKey}>
            <View style={styles.itemRow}>
              {/* Icon container */}
              <View
                style={[
                  styles.itemIconBox,
                  { backgroundColor: theme.colors.surfaceSecondary },
                ]}
              >
                <Ionicons
                  name={item.icon}
                  size={28}
                  color={theme.colors.primary}
                />
              </View>

              {/* Text content */}
              <View style={styles.itemText}>
                <TText style={[styles.itemTitle, { color: theme.colors.text }]}>
                  {t(item.titleKey)}
                </TText>
                <TText
                  style={[
                    styles.itemDesc,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {t(item.descKey)}
                </TText>
              </View>

              {/* Chevron */}
              <Ionicons
                name="chevron-forward"
                size={18}
                color={theme.colors.textMuted}
              />
            </View>

            {/* Separator (except last) */}
            {index < GUIDE_ITEMS.length - 1 && (
              <View
                style={[
                  styles.separator,
                  { backgroundColor: theme.colors.border },
                ]}
              />
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  headerSafe: {
    paddingBottom: 28,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  headerClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    alignItems: "center",
    marginTop: 12,
  },
  headerIcon: {
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFF",
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    gap: 14,
  },
  itemIconBox: {
    width: 60,
    height: 60,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  itemDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 74,
  },
});
