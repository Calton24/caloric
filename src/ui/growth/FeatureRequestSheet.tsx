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
  { key: "bug", label: "Bug" },
  { key: "feature", label: "Feature" },
  { key: "improvement", label: "Improvement" },
] as const;

const SEVERITY_OPTIONS = [
  { key: "low", label: "Low" },
  { key: "med", label: "Med" },
  { key: "high", label: "High" },
] as const;

type RequestStatus = "idle" | "loading" | "success";

export function FeatureRequestSheet() {
  const { theme } = useTheme();
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
        setError("Title is required.");
        return;
      }

      const now = Date.now();
      if (lastLocalSubmitAt && now - lastLocalSubmitAt < COOLDOWN_MS) {
        const remaining = Math.ceil(
          (COOLDOWN_MS - (now - lastLocalSubmitAt)) / 1000
        );
        setCooldownMessage(
          `Please wait ${remaining}s before submitting another request.`
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
              `Please wait about ${cooldownSeconds}s before submitting again.`
            );
            return;
          }
          if (err.code === "duplicate") {
            setError("You already sent this request in the last 24 hours.");
            return;
          }
          if (err.code === "invalid_title") {
            setError("Title is required.");
            return;
          }
        }
        setError("Something went wrong. Please try again.");
      }
    });
  };

  if (status === "success") {
    return (
      <View style={[styles.container, { padding: theme.spacing.lg }]}>
        <TText variant="heading">Request sent</TText>
        <TSpacer size="sm" />
        <TText color="secondary">Thanks for the feedback.</TText>
        <TSpacer size="lg" />
        <TButton
          onPress={() => {
            resetForm();
            setStatus("idle");
          }}
          variant="secondary"
        >
          Send another
        </TButton>
        <TSpacer size="sm" />
        <TButton onPress={close} variant="outline">
          Close
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
      <TText variant="heading">Feature request</TText>
      <TSpacer size="xs" />
      <TText color="secondary">
        Share a quick request or improvement. We keep it lightweight.
      </TText>

      <TSpacer size="lg" />

      <FormField
        label="Title"
        required
        value={title}
        onChangeText={setTitle}
        placeholder="Short summary"
        autoCorrect={false}
        autoCapitalize="sentences"
        returnKeyType="next"
      />

      <TSpacer size="md" />

      <TText style={{ fontSize: theme.typography.fontSize.sm }}>
        Description
      </TText>
      <TSpacer size="xs" />
      <TInput
        value={description}
        onChangeText={setDescription}
        placeholder="Extra detail helps"
        multiline
        numberOfLines={4}
        style={{ height: 110, textAlignVertical: "top" }}
      />

      <TSpacer size="md" />

      <TText style={{ fontSize: theme.typography.fontSize.sm }}>Category</TText>
      <TSpacer size="xs" />
      <View style={styles.pillRow}>
        {CATEGORY_OPTIONS.map((option) => (
          <PillOption
            key={option.key}
            label={option.label}
            selected={category === option.key}
            onPress={() =>
              setCategory(category === option.key ? undefined : option.key)
            }
          />
        ))}
      </View>

      <TSpacer size="md" />

      <TText style={{ fontSize: theme.typography.fontSize.sm }}>Severity</TText>
      <TSpacer size="xs" />
      <View style={styles.pillRow}>
        {SEVERITY_OPTIONS.map((option) => (
          <PillOption
            key={option.key}
            label={option.label}
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
        Submit request
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
