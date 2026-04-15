/**
 * Body Measurements Settings
 *
 * Edit gender, birth year, current weight, and height.
 * Reads/writes from useProfileStore.
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useProfileStore } from "../../../src/features/profile";
import type { Gender } from "../../../src/features/profile/profile.types";
import { useTheme } from "../../../src/theme/useTheme";
import { TSpacer } from "../../../src/ui/primitives/TSpacer";
import { TText } from "../../../src/ui/primitives/TText";

const GENDER_OPTIONS: { label: string; value: Gender }[] = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Other", value: "other" },
];

export default function BodyMeasurementsScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  const profile = useProfileStore((s) => s.profile);
  const updateProfile = useProfileStore((s) => s.updateProfile);

  // Local state for text inputs (committed on blur)
  const [birthYearText, setBirthYearText] = useState(
    profile.birthYear?.toString() ?? ""
  );
  const [weightText, setWeightText] = useState(
    profile.currentWeightLbs?.toString() ?? ""
  );
  const [heightText, setHeightText] = useState(
    profile.heightCm?.toString() ?? ""
  );

  const handleGenderSelect = useCallback(
    (gender: Gender) => {
      updateProfile({ gender });
    },
    [updateProfile]
  );

  const commitBirthYear = useCallback(() => {
    const parsed = parseInt(birthYearText, 10);
    if (
      !isNaN(parsed) &&
      parsed >= 1900 &&
      parsed <= new Date().getFullYear()
    ) {
      updateProfile({ birthYear: parsed });
    }
  }, [birthYearText, updateProfile]);

  const commitWeight = useCallback(() => {
    const parsed = parseFloat(weightText);
    if (!isNaN(parsed) && parsed > 0) {
      updateProfile({ currentWeightLbs: parsed });
    }
  }, [weightText, updateProfile]);

  const commitHeight = useCallback(() => {
    const parsed = parseFloat(heightText);
    if (!isNaN(parsed) && parsed > 0) {
      updateProfile({ heightCm: parsed });
    }
  }, [heightText, updateProfile]);

  const weightLabel = profile.weightUnit === "kg" ? "kg" : "lbs";
  const heightLabel = profile.heightUnit === "ft_in" ? "ft/in" : "cm";

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
            Body Measurements
          </TText>
          <View style={{ width: 24 }} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Gender */}
            <TText
              style={[styles.sectionTitle, { color: theme.colors.textMuted }]}
            >
              Gender
            </TText>
            <View
              style={[
                styles.section,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              {GENDER_OPTIONS.map((option, index) => {
                const isSelected = option.value === profile.gender;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => handleGenderSelect(option.value)}
                    style={[
                      styles.row,
                      index < GENDER_OPTIONS.length - 1 && {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: theme.colors.border,
                      },
                    ]}
                  >
                    <TText
                      style={[styles.rowLabel, { color: theme.colors.text }]}
                    >
                      {option.label}
                    </TText>
                    {isSelected && (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={theme.colors.primary}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>

            <TSpacer size="lg" />

            {/* Year of Birth */}
            <TText
              style={[styles.sectionTitle, { color: theme.colors.textMuted }]}
            >
              Year of Birth
            </TText>
            <View
              style={[
                styles.section,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <View style={styles.inputRow}>
                <TextInput
                  value={birthYearText}
                  onChangeText={setBirthYearText}
                  onBlur={commitBirthYear}
                  keyboardType="number-pad"
                  maxLength={4}
                  placeholder="e.g. 1990"
                  placeholderTextColor={theme.colors.textMuted}
                  style={[styles.input, { color: theme.colors.text }]}
                  returnKeyType="done"
                />
              </View>
            </View>

            <TSpacer size="lg" />

            {/* Weight */}
            <TText
              style={[styles.sectionTitle, { color: theme.colors.textMuted }]}
            >
              Weight ({weightLabel})
            </TText>
            <View
              style={[
                styles.section,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <View style={styles.inputRow}>
                <TextInput
                  value={weightText}
                  onChangeText={setWeightText}
                  onBlur={commitWeight}
                  keyboardType="decimal-pad"
                  placeholder={`e.g. ${profile.weightUnit === "kg" ? "75" : "165"}`}
                  placeholderTextColor={theme.colors.textMuted}
                  style={[styles.input, { color: theme.colors.text }]}
                  returnKeyType="done"
                />
                <TText
                  style={[
                    styles.unitLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {weightLabel}
                </TText>
              </View>
            </View>

            <TSpacer size="lg" />

            {/* Height */}
            <TText
              style={[styles.sectionTitle, { color: theme.colors.textMuted }]}
            >
              Height ({heightLabel})
            </TText>
            <View
              style={[
                styles.section,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <View style={styles.inputRow}>
                <TextInput
                  value={heightText}
                  onChangeText={setHeightText}
                  onBlur={commitHeight}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 175"
                  placeholderTextColor={theme.colors.textMuted}
                  style={[styles.input, { color: theme.colors.text }]}
                  returnKeyType="done"
                />
                <TText
                  style={[
                    styles.unitLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {heightLabel}
                </TText>
              </View>
            </View>

            <TSpacer size="xxl" />
          </ScrollView>
        </KeyboardAvoidingView>
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
  flex: {
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  section: {
    borderRadius: 14,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    paddingVertical: 4,
  },
  unitLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
  },
});
