/**
 * Voice & Text Input Settings
 *
 * Language picker for voice/text input.
 * Reads/writes inputLanguage from useSettingsStore.
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    LANGUAGE_OPTIONS,
    useSettingsStore,
} from "../../../src/features/settings";
import type { LanguageOption } from "../../../src/features/settings/settings.types";
import { useAppTranslation } from "../../../src/infrastructure/i18n/useAppTranslation";
import { useTheme } from "../../../src/theme/useTheme";
import { TText } from "../../../src/ui/primitives/TText";

function LanguageRow({
  item,
  isSelected,
  onSelect,
}: {
  item: LanguageOption;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onSelect}
      style={[styles.row, { borderBottomColor: theme.colors.border }]}
    >
      <TText style={styles.flag}>{item.flag}</TText>
      <TText style={[styles.label, { color: theme.colors.text }]}>
        {item.label}
      </TText>
      {isSelected && (
        <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
      )}
    </Pressable>
  );
}

export default function VoiceTextInputScreen() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const router = useRouter();

  const inputLanguage = useSettingsStore((s) => s.settings.inputLanguage);
  const setInputLanguage = useSettingsStore((s) => s.setInputLanguage);

  const handleSelect = useCallback(
    (code: string) => {
      setInputLanguage(code);
    },
    [setInputLanguage]
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <SafeAreaView style={styles.safe} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </Pressable>
          <TText
            variant="heading"
            style={[styles.headerTitle, { color: theme.colors.text }]}
          >
            {t("settings.voiceTextInput")}
          </TText>
          <View style={{ width: 24 }} />
        </View>

        {/* Description */}
        <TText
          style={[styles.description, { color: theme.colors.textSecondary }]}
        >
          {t("settings.voiceTextInputDesc")}
        </TText>

        {/* Language list */}
        <FlatList
          data={LANGUAGE_OPTIONS}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => (
            <LanguageRow
              item={item}
              isSelected={item.value === inputLanguage}
              onSelect={() => handleSelect(item.value)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  description: {
    fontSize: 14,
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  listContent: {
    paddingHorizontal: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  flag: {
    fontSize: 22,
  },
  label: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
  },
});
