/**
 * FeatureRequestSheet
 * Simple growth layer UI for feature requests.
 */

import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import {
    COOLDOWN_MS,
    growth,
    GrowthRequestError,
} from "../../infrastructure/growth";
import { useAppTranslation } from "../../infrastructure/i18n";
import { useTheme } from "../../theme/useTheme";
import { FormField } from "../forms/FormField";
import { useSubmitLock } from "../forms/useSubmitLock";
import { GlassSurface } from "../glass/GlassSurface";
import { TButton } from "../primitives/TButton";
import { TInput } from "../primitives/TInput";
import { TSpacer } from "../primitives/TSpacer";
import { TText } from "../primitives/TText";
import { useBottomSheet } from "../sheets/useBottomSheet";

const CATEGORY_OPTIONS = [
  { key: "bug", labelKey: "featureRequest.categoryBug" },
  { key: "feature", labelKey: "featureRequest.categoryFeature" },
  { key: "improvement", labelKey: "featureRequest.categoryImprovement" },
] as const;

const SEVERITY_OPTIONS = [
  { key: "low", labelKey: "featureRequest.severityLow" },
  { key: "med", labelKey: "featureRequest.severityMed" },
  { key: "high", labelKey: "featureRequest.severityHigh" },
] as const;

type RequestStatus = "idle" | "loading" | "success";

export function FeatureRequestSheet() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const { close } = useBottomSheet();
  const { isSubmitting, withSubmitLock } = useSubmitLock();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<
    "bug" | "feature" | "improvement" | undefined
  >();
  const [severity, setSeverity] = useState<
    "low" | "med" | "high" | undefined
  >();
  const [status, setStatus] = useState<RequestStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [cooldownMessage, setCooldownMessage] = useState<string | null>(null);
  const [lastLocalSubmitAt, setLastLocalSubmitAt] = useState<number | null>(
    null
  );

  const cooldownSeconds = useMemo(() => Math.ceil(COOLDOWN_MS / 1000), []);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCategory(undefined);
    setSeverity(undefined);
    setError(null);
    setCooldownMessage(null);
  };

  const handleSubmit = () => {
    withSubmitLock(async () => {
      setError(null);
      setCooldownMessage(null);

      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        setError(t("featureRequest.titleRequired"));
        return;
      }

      const now = Date.now();
      if (lastLocalSubmitAt && now - lastLocalSubmitAt < COOLDOWN_MS) {
        const remaining = Math.ceil(
          (COOLDOWN_MS - (now - lastLocalSubmitAt)) / 1000
        );
        setCooldownMessage(
          t("featureRequest.cooldown", { seconds: remaining })
        );
        return;
      }

      setStatus("loading");

      try {
        await growth.requestFeature({
          title: trimmedTitle,
          description: description.trim() || undefined,
          category,
          severity,
        });
        setLastLocalSubmitAt(now);
        setStatus("success");
      } catch (err) {
        setStatus("idle");
        if (err instanceof GrowthRequestError) {
          if (err.code === "cooldown") {
            setCooldownMessage(
              t("featureRequest.cooldownRetry", { seconds: cooldownSeconds })
            );
            return;
          }
          if (err.code === "duplicate") {
            setError(t("featureRequest.duplicate"));
            return;
          }
          if (err.code === "invalid_title") {
            setError(t("featureRequest.titleRequired"));
            return;
          }
        }
        setError(t("featureRequest.genericError"));
      }
    });
  };

  if (status === "success") {
    return (
      <View style={[styles.container, { padding: theme.spacing.lg }]}>
        <TText variant="heading">{t("featureRequest.successHeading")}</TText>
        <TSpacer size="sm" />
        <TText color="secondary">{t("featureRequest.successMessage")}</TText>
        <TSpacer size="lg" />
        <TButton
          onPress={() => {
            resetForm();
            setStatus("idle");
          }}
          variant="secondary"
        >
          {t("featureRequest.sendAnother")}
        </TButton>
        <TSpacer size="sm" />
        <TButton onPress={close} variant="outline">
          {t("featureRequest.close")}
        </TButton>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <TText variant="heading">{t("featureRequest.heading")}</TText>
      <TSpacer size="xs" />
      <TText color="secondary">{t("featureRequest.subtitle")}</TText>

      <TSpacer size="lg" />

      <FormField
        label={t("featureRequest.titleLabel")}
        required
        value={title}
        onChangeText={setTitle}
        placeholder={t("featureRequest.titlePlaceholder")}
        autoCorrect={false}
        autoCapitalize="sentences"
        returnKeyType="next"
      />

      <TSpacer size="md" />

      <TText style={{ fontSize: theme.typography.fontSize.sm }}>
        {t("featureRequest.descriptionLabel")}
      </TText>
      <TSpacer size="xs" />
      <TInput
        value={description}
        onChangeText={setDescription}
        placeholder={t("featureRequest.descriptionPlaceholder")}
        multiline
        numberOfLines={4}
        style={{ height: 110, textAlignVertical: "top" }}
      />

      <TSpacer size="md" />

      <TText style={{ fontSize: theme.typography.fontSize.sm }}>
        {t("featureRequest.categoryLabel")}
      </TText>
      <TSpacer size="xs" />
      <View style={styles.pillRow}>
        {CATEGORY_OPTIONS.map((option) => (
          <PillOption
            key={option.key}
            label={t(option.labelKey)}
            selected={category === option.key}
            onPress={() =>
              setCategory(category === option.key ? undefined : option.key)
            }
          />
        ))}
      </View>

      <TSpacer size="md" />

      <TText style={{ fontSize: theme.typography.fontSize.sm }}>
        {t("featureRequest.severityLabel")}
      </TText>
      <TSpacer size="xs" />
      <View style={styles.pillRow}>
        {SEVERITY_OPTIONS.map((option) => (
          <PillOption
            key={option.key}
            label={t(option.labelKey)}
            selected={severity === option.key}
            onPress={() =>
              setSeverity(severity === option.key ? undefined : option.key)
            }
          />
        ))}
      </View>

      <TSpacer size="lg" />

      {cooldownMessage && (
        <TText color="muted" style={{ marginBottom: theme.spacing.sm }}>
          {cooldownMessage}
        </TText>
      )}

      {error && (
        <TText
          style={{ color: theme.colors.error, marginBottom: theme.spacing.sm }}
        >
          {error}
        </TText>
      )}

      <TButton
        onPress={handleSubmit}
        loading={isSubmitting || status === "loading"}
      >
        {t("featureRequest.submit")}
      </TButton>
    </ScrollView>
  );
}

function PillOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();

  return (
    <Pressable onPress={onPress} style={{ opacity: selected ? 1 : 0.9 }}>
      <GlassSurface
        variant="pill"
        border={selected}
        style={[
          styles.pill,
          selected && {
            borderColor: theme.colors.primary,
          },
        ]}
      >
        <TText
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: selected ? theme.colors.primary : theme.colors.textMuted,
          }}
        >
          {label}
        </TText>
      </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
});
