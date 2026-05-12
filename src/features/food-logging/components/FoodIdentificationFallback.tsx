/**
 * FoodIdentificationFallback
 *
 * Unified recovery UI for failed food detection across all 3 input flows
 * (camera, barcode, manual). Production-grade replacement for the previous
 * camera-log "Couldn't Identify" inline state, which had a permanently
 * disabled CTA, no keyboard avoidance, and silent retry failures.
 *
 * Design rules:
 *   - Primary CTA enabled when query.trim().length >= 2.
 *   - CTA shows a loading spinner while a lookup is in flight; never
 *     permanently disabled.
 *   - Retry / Retake / Scan again / Manual buttons are always tappable
 *     unless their callback is missing or a lookup is in flight.
 *   - Keyboard does not cover the CTA — `KeyboardAvoidingView` + scroll.
 *   - Accessibility labels + role on every interactive element.
 *   - Theme tokens for both light and dark mode.
 */

import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTranslation } from "../../../infrastructure/i18n/useAppTranslation";
import { useTheme } from "../../../theme/useTheme";
import { TSpacer } from "../../../ui/primitives/TSpacer";
import { TText } from "../../../ui/primitives/TText";
import {
  trackFoodIdentificationAbandoned,
  trackFoodIdentificationFailed,
  trackFoodIdentificationManualRecovery,
  trackFoodIdentificationProviderFailed,
  trackFoodIdentificationRetry,
} from "../food-identification-analytics";

export type FoodIdentificationSource = "camera" | "barcode" | "manual";

export type FoodIdentificationErrorReason =
  | "no_food_detected"
  | "low_confidence"
  | "barcode_not_found"
  | "ai_failed"
  | "manual_not_found"
  | "network_error"
  | "unknown";

export type FoodIdentificationLookupResult =
  | { ok: true }
  | { ok: false; message?: string };

export interface FoodIdentificationFallbackProps {
  source: FoodIdentificationSource;
  imageUri?: string | null;
  barcode?: string | null;
  initialQuery?: string | null;
  errorReason?: FoodIdentificationErrorReason;
  /** Called when the user taps the back chevron in the header. */
  onBack?: () => void;
  /** Retry the same input (rerun AI on same image, re-search same query, etc.). */
  onRetry?: () => void | Promise<void>;
  /** Take a new photo (camera) or rescan barcode. */
  onRetake?: () => void | Promise<void>;
  /** Open the manual/typed entry path. */
  onAddManually?: () => void | Promise<void>;
  /** Resolve via user-typed query. Return `{ ok: false, message }` to display inline error. */
  onResolveQuery?: (
    query: string,
  ) => Promise<FoodIdentificationLookupResult> | FoodIdentificationLookupResult;
}

const SUGGESTION_CHIPS: Record<FoodIdentificationSource, string[]> = {
  camera: [
    "fallback.suggestionAddBrand",
    "fallback.suggestionAddPortion",
    "fallback.suggestionDescribeIngredients",
  ],
  barcode: [
    "fallback.suggestionAddBrand",
    "fallback.suggestionAddPortion",
  ],
  manual: [
    "fallback.suggestionAddBrand",
    "fallback.suggestionAddPortion",
    "fallback.suggestionDescribeIngredients",
  ],
};

function clampQuery(input: string): string {
  return input.trimStart().slice(0, 240);
}

export function FoodIdentificationFallback({
  source,
  imageUri,
  barcode,
  initialQuery,
  errorReason,
  onBack,
  onRetry,
  onRetake,
  onAddManually,
  onResolveQuery,
}: FoodIdentificationFallbackProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();

  const [query, setQuery] = useState<string>(initialQuery ?? "");
  const [isLooking, setIsLooking] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const resolvedErrorReason: FoodIdentificationErrorReason | "unknown" =
    errorReason ?? "unknown";

  useEffect(() => {
    trackFoodIdentificationFailed({
      source,
      error_reason: resolvedErrorReason,
      has_image: Boolean(imageUri),
      has_barcode: Boolean(barcode),
      initial_query_length: (initialQuery ?? "").trim().length,
    });
  }, [
    source,
    resolvedErrorReason,
    imageUri,
    barcode,
    initialQuery,
  ]);

  const handleBack = useCallback(() => {
    trackFoodIdentificationAbandoned({
      source,
      error_reason: resolvedErrorReason,
    });
    onBack?.();
  }, [onBack, source, resolvedErrorReason]);

  const trimmed = query.trim();
  const canLookup = trimmed.length >= 2 && !isLooking;

  const titleKey =
    source === "camera"
      ? "fallback.cameraTitle"
      : source === "barcode"
        ? "fallback.barcodeTitle"
        : "fallback.manualTitle";

  const subtitleKey =
    source === "camera"
      ? "fallback.cameraSubtitle"
      : source === "barcode"
        ? "fallback.barcodeSubtitle"
        : "fallback.manualSubtitle";

  const placeholderKey =
    source === "camera"
      ? "fallback.cameraPlaceholder"
      : source === "barcode"
        ? "fallback.barcodePlaceholder"
        : "fallback.manualPlaceholder";

  const reasonHintKey =
    errorReason === "network_error"
      ? "fallback.reasonNetwork"
      : errorReason === "barcode_not_found"
        ? "fallback.reasonBarcodeNotFound"
        : errorReason === "low_confidence"
          ? "fallback.reasonLowConfidence"
          : null;

  const handleSubmit = useCallback(async () => {
    if (!canLookup || !onResolveQuery) return;
    setInlineError(null);
    setIsLooking(true);
    try {
      const result = await onResolveQuery(trimmed);
      if (!result.ok) {
        setInlineError(result.message ?? t("fallback.stillNotFound"));
      }
    } catch {
      setInlineError(t("fallback.lookupFailed"));
      trackFoodIdentificationProviderFailed({
        surface: "fallback_recovery",
        recovery_source: source,
        reason: "exception",
        query_length: trimmed.length,
      });
    } finally {
      setIsLooking(false);
    }
  }, [canLookup, onResolveQuery, trimmed, t, source]);

  const handleChip = useCallback((chip: string) => {
    setQuery((current) => clampQuery(current ? `${current} ${chip}` : chip));
  }, []);

  const showRetake = source === "camera" || source === "barcode";
  const retakeLabelKey =
    source === "barcode" ? "fallback.scanAgain" : "fallback.retake";

  return (
    <View
      style={[styles.root, { backgroundColor: theme.colors.background }]}
      testID="food-identification-fallback"
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <SafeAreaView style={styles.flex} edges={["top", "bottom"]}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              onPress={handleBack}
              hitSlop={16}
              accessibilityRole="button"
              accessibilityLabel={t("common.back")}
              testID="fallback-back"
            >
              <Ionicons
                name="chevron-back"
                size={24}
                color={theme.colors.text}
              />
            </Pressable>
            <TText
              variant="heading"
              numberOfLines={1}
              style={[styles.headerTitle, { color: theme.colors.text }]}
            >
              {t(titleKey)}
            </TText>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Image preview (camera only) */}
            {source === "camera" && imageUri ? (
              <Animated.View
                entering={FadeIn.duration(220)}
                style={styles.previewWrap}
              >
                <Image
                  source={{ uri: imageUri }}
                  style={styles.previewImage}
                  contentFit="cover"
                />
              </Animated.View>
            ) : (
              <View style={styles.iconBubbleWrap}>
                <View
                  style={[
                    styles.iconBubble,
                    {
                      backgroundColor:
                        (theme.colors.warning ?? "#F59E0B") + "1F",
                    },
                  ]}
                  accessibilityRole="image"
                >
                  <Ionicons
                    name={
                      source === "barcode"
                        ? "barcode-outline"
                        : "search-outline"
                    }
                    size={28}
                    color={theme.colors.warning ?? "#F59E0B"}
                  />
                </View>
              </View>
            )}

            <TSpacer size="md" />

            <TText
              variant="heading"
              style={[styles.title, { color: theme.colors.text }]}
            >
              {t(`${titleKey}Headline`)}
            </TText>
            <TSpacer size="xs" />
            <TText
              style={[
                styles.subtitle,
                { color: theme.colors.textSecondary },
              ]}
            >
              {t(subtitleKey)}
            </TText>
            {barcode ? (
              <>
                <TSpacer size="xs" />
                <TText
                  style={[
                    styles.barcodeLabel,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  {t("fallback.barcodeLabel", { code: barcode })}
                </TText>
              </>
            ) : null}

            <TSpacer size="md" />

            {/* Query input */}
            <View
              style={[
                styles.inputBox,
                {
                  backgroundColor: theme.colors.surfaceSecondary,
                  borderColor: trimmed
                    ? theme.colors.primary + "55"
                    : theme.colors.border,
                },
              ]}
            >
              <Ionicons
                name="sparkles-outline"
                size={18}
                color={theme.colors.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                value={query}
                onChangeText={(v) => {
                  setInlineError(null);
                  setQuery(clampQuery(v));
                }}
                placeholder={t(placeholderKey)}
                placeholderTextColor={theme.colors.textMuted}
                multiline
                numberOfLines={3}
                blurOnSubmit
                returnKeyType="search"
                autoCapitalize="sentences"
                autoCorrect
                enablesReturnKeyAutomatically
                keyboardAppearance={theme.mode === "dark" ? "dark" : "light"}
                onSubmitEditing={handleSubmit}
                editable={!isLooking}
                accessibilityLabel={t(placeholderKey)}
                style={[styles.input, { color: theme.colors.text }]}
                testID="fallback-query-input"
              />
            </View>

            {reasonHintKey ? (
              <>
                <TSpacer size="xs" />
                <TText
                  style={[
                    styles.reasonHint,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  {t(reasonHintKey)}
                </TText>
              </>
            ) : null}

            {inlineError ? (
              <Animated.View entering={FadeIn.duration(180)}>
                <TSpacer size="sm" />
                <View
                  style={[
                    styles.errorBox,
                    {
                      backgroundColor: (theme.colors.error ?? "#DC2626") + "14",
                      borderColor: (theme.colors.error ?? "#DC2626") + "55",
                    },
                  ]}
                  accessibilityLiveRegion="polite"
                  accessibilityRole="alert"
                >
                  <Ionicons
                    name="alert-circle-outline"
                    size={16}
                    color={theme.colors.error ?? "#DC2626"}
                  />
                  <TText
                    style={[
                      styles.errorText,
                      { color: theme.colors.error ?? "#DC2626" },
                    ]}
                  >
                    {inlineError}
                  </TText>
                </View>
              </Animated.View>
            ) : null}

            <TSpacer size="md" />

            {/* Suggestion chips */}
            <View style={styles.chipRow}>
              {SUGGESTION_CHIPS[source].map((chipKey) => (
                <Pressable
                  key={chipKey}
                  onPress={() => handleChip(t(chipKey))}
                  accessibilityRole="button"
                  accessibilityLabel={t(chipKey)}
                  style={({ pressed }) => [
                    styles.chip,
                    {
                      backgroundColor: theme.colors.surfaceSecondary,
                      borderColor: theme.colors.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <TText
                    style={[styles.chipText, { color: theme.colors.text }]}
                  >
                    {t(chipKey)}
                  </TText>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {/* Bottom action stack — never sits under the keyboard */}
          <View style={styles.bottomStack}>
            <Pressable
              onPress={handleSubmit}
              disabled={!canLookup}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canLookup, busy: isLooking }}
              accessibilityLabel={t("fallback.findFood")}
              testID="fallback-find-food"
              style={({ pressed }) => [
                styles.primaryBtn,
                {
                  backgroundColor: theme.colors.primary,
                  opacity: !canLookup ? 0.55 : pressed ? 0.92 : 1,
                },
              ]}
            >
              {isLooking ? (
                <ActivityIndicator
                  size="small"
                  color={theme.colors.textInverse}
                />
              ) : (
                <Ionicons
                  name="search"
                  size={18}
                  color={theme.colors.textInverse}
                />
              )}
              <TText
                style={[
                  styles.primaryBtnText,
                  { color: theme.colors.textInverse },
                ]}
              >
                {isLooking
                  ? t("fallback.searching")
                  : t("fallback.findFood")}
              </TText>
            </Pressable>

            <View style={styles.secondaryRow}>
              {onRetry ? (
                <Pressable
                  onPress={() => {
                    if (isLooking) return;
                    setInlineError(null);
                    trackFoodIdentificationRetry({
                      source,
                      retry_kind: "retry_ai",
                    });
                    void onRetry();
                  }}
                  disabled={isLooking}
                  accessibilityRole="button"
                  accessibilityLabel={t("fallback.retry")}
                  testID="fallback-retry"
                  style={({ pressed }) => [
                    styles.secondaryBtn,
                    {
                      backgroundColor: theme.colors.surfaceSecondary,
                      opacity: isLooking ? 0.6 : pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Ionicons
                    name="refresh"
                    size={16}
                    color={theme.colors.text}
                  />
                  <TText
                    style={[
                      styles.secondaryBtnText,
                      { color: theme.colors.text },
                    ]}
                  >
                    {t("fallback.retry")}
                  </TText>
                </Pressable>
              ) : null}
              {showRetake && onRetake ? (
                <Pressable
                  onPress={() => {
                    if (isLooking) return;
                    trackFoodIdentificationRetry({
                      source,
                      retry_kind:
                        source === "barcode" ? "scan_again" : "retake",
                    });
                    void onRetake();
                  }}
                  disabled={isLooking}
                  accessibilityRole="button"
                  accessibilityLabel={t(retakeLabelKey)}
                  testID="fallback-retake"
                  style={({ pressed }) => [
                    styles.secondaryBtn,
                    {
                      backgroundColor: theme.colors.surfaceSecondary,
                      opacity: isLooking ? 0.6 : pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Ionicons
                    name={source === "barcode" ? "barcode" : "camera"}
                    size={16}
                    color={theme.colors.text}
                  />
                  <TText
                    style={[
                      styles.secondaryBtnText,
                      { color: theme.colors.text },
                    ]}
                  >
                    {t(retakeLabelKey)}
                  </TText>
                </Pressable>
              ) : null}
            </View>

            {onAddManually ? (
              <Pressable
                onPress={() => {
                  if (isLooking) return;
                  trackFoodIdentificationManualRecovery({ source });
                  void onAddManually();
                }}
                disabled={isLooking}
                accessibilityRole="link"
                accessibilityLabel={t("fallback.addManually")}
                testID="fallback-add-manually"
                style={styles.tertiaryBtn}
              >
                <TText
                  style={[
                    styles.tertiaryBtnText,
                    { color: theme.colors.primary },
                  ]}
                >
                  {t("fallback.addManually")}
                </TText>
              </Pressable>
            ) : null}
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  previewWrap: {
    alignSelf: "center",
    marginTop: 4,
  },
  previewImage: {
    width: 144,
    height: 144,
    borderRadius: 24,
  },
  iconBubbleWrap: { alignItems: "center", marginTop: 6 },
  iconBubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
  },
  barcodeLabel: {
    fontSize: 12,
    textAlign: "center",
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 80,
  },
  inputIcon: { marginTop: 2 },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    minHeight: 56,
    paddingTop: 0,
    paddingBottom: 0,
  },
  reasonHint: {
    fontSize: 12,
    textAlign: "center",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: { fontSize: 13, fontWeight: "500", flex: 1 },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  chip: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: { fontSize: 13, fontWeight: "600" },
  bottomStack: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 10,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: 20,
  },
  primaryBtnText: { fontSize: 16, fontWeight: "700" },
  secondaryRow: {
    flexDirection: "row",
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  secondaryBtnText: { fontSize: 14, fontWeight: "600" },
  tertiaryBtn: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  tertiaryBtnText: { fontSize: 14, fontWeight: "600" },
});
