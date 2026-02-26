/**
 * I18nDebugPanel
 *
 * Dev-only panel for testing i18n infrastructure.
 * Shows current language, device locale, and language-switch buttons.
 *
 * Import only from feature / dev screens — not from infrastructure.
 */

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { SupportedLanguage } from "../../infrastructure/i18n";
import {
    getDeviceLocale,
    LANGUAGE_LABELS,
    SUPPORTED_LANGUAGES,
    useAppTranslation
} from "../../infrastructure/i18n";
import { useTheme } from "../../theme/useTheme";
import { GlassCard } from "../glass/GlassCard";
import { TSpacer } from "../primitives/TSpacer";
import { TText } from "../primitives/TText";

// ---------- Component ----------

export function I18nDebugPanel() {
  const { theme } = useTheme();
  const { t, language, changeLanguage } = useAppTranslation();

  const deviceLocale = getDeviceLocale();

  return (
    <View style={styles.container}>
      {/* ── Status ── */}
      <GlassCard>
        <View style={styles.statusRow}>
          <View style={styles.statusItem}>
            <TText
              color="secondary"
              variant="caption"
              style={{ marginBottom: 4 }}
            >
              Active Language
            </TText>
            <View style={styles.statusBadge}>
              <Ionicons
                name="language-outline"
                size={16}
                color={theme.colors.primary}
              />
              <TText
                style={[styles.statusValue, { color: theme.colors.primary }]}
              >
                {language.toUpperCase()}
              </TText>
            </View>
          </View>

          <View style={styles.statusItem}>
            <TText
              color="secondary"
              variant="caption"
              style={{ marginBottom: 4 }}
            >
              Device Locale
            </TText>
            <View style={styles.statusBadge}>
              <Ionicons
                name="phone-portrait-outline"
                size={16}
                color={theme.colors.textSecondary}
              />
              <TText color="secondary" style={styles.statusValue}>
                {deviceLocale}
              </TText>
            </View>
          </View>
        </View>
      </GlassCard>

      <TSpacer size="md" />

      {/* ── Language Picker ── */}
      <GlassCard>
        <TText variant="subheading" style={{ marginBottom: 12 }}>
          Switch Language
        </TText>

        <View style={styles.langGrid}>
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isActive = lang === language;
            return (
              <Pressable
                key={lang}
                onPress={() => changeLanguage(lang as SupportedLanguage)}
                style={[
                  styles.langButton,
                  {
                    backgroundColor: isActive
                      ? theme.colors.primary
                      : theme.colors.glassBackground,
                    borderColor: isActive
                      ? theme.colors.primary
                      : theme.colors.glassBorder,
                  },
                ]}
              >
                <TText
                  style={[
                    styles.langCode,
                    { color: isActive ? "#fff" : theme.colors.text },
                  ]}
                >
                  {lang.toUpperCase()}
                </TText>
                <TText
                  variant="caption"
                  style={{
                    color: isActive
                      ? "rgba(255,255,255,0.8)"
                      : theme.colors.textSecondary,
                  }}
                >
                  {LANGUAGE_LABELS[lang as SupportedLanguage]}
                </TText>
              </Pressable>
            );
          })}
        </View>
      </GlassCard>

      <TSpacer size="md" />

      {/* ── Live Preview ── */}
      <GlassCard>
        <TText variant="subheading" style={{ marginBottom: 12 }}>
          Live Translation Preview
        </TText>

        <View style={styles.previewRow}>
          <TText color="secondary" variant="caption">
            app.title
          </TText>
          <TText>{t("app.title")}</TText>
        </View>

        <View style={styles.previewRow}>
          <TText color="secondary" variant="caption">
            auth.signIn
          </TText>
          <TText>{t("auth.signIn")}</TText>
        </View>

        <View style={styles.previewRow}>
          <TText color="secondary" variant="caption">
            auth.welcome
          </TText>
          <TText>{t("auth.welcome")}</TText>
        </View>

        <View style={styles.previewRow}>
          <TText color="secondary" variant="caption">
            common.save
          </TText>
          <TText>{t("common.save")}</TText>
        </View>

        <View style={styles.previewRow}>
          <TText color="secondary" variant="caption">
            common.loading
          </TText>
          <TText>{t("common.loading")}</TText>
        </View>

        <View style={styles.previewRow}>
          <TText color="secondary" variant="caption">
            calories.label
          </TText>
          <TText>{t("calories.label")}</TText>
        </View>

        <View style={[styles.previewRow, { borderBottomWidth: 0 }]}>
          <TText color="secondary" variant="caption">
            calories.value (count=5)
          </TText>
          <TText>{t("calories.value", { count: 5 })}</TText>
        </View>
      </GlassCard>
    </View>
  );
}

// ---------- Styles ----------

const styles = StyleSheet.create({
  container: {},
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statusItem: {
    alignItems: "center",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusValue: {
    fontWeight: "600",
    fontSize: 15,
  },
  langGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  langButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    minWidth: 90,
  },
  langCode: {
    fontWeight: "700",
    fontSize: 15,
    marginBottom: 2,
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(128,128,128,0.2)",
  },
});
