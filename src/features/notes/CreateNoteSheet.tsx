/**
 * CreateNoteSheet
 * Bottom sheet for creating new notes
 */

import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { analytics } from "../../analytics/analytics";
import { logger } from "../../logging/logger";
import { useTheme } from "../../theme/useTheme";
import { TButton } from "../../ui/primitives/TButton";
import { TInput } from "../../ui/primitives/TInput";
import { TSpacer } from "../../ui/primitives/TSpacer";
import { TText } from "../../ui/primitives/TText";
import { createNote } from "./notes.service";

interface CreateNoteSheetProps {
  userId: string;
  onSuccess: () => void;
  onClose: () => void;
}

export function CreateNoteSheet({
  userId,
  onSuccess,
  onClose,
}: CreateNoteSheetProps) {
  const { theme } = useTheme();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!content.trim()) {
      setError("Note content cannot be empty");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await createNote(content.trim(), userId);
      analytics.track("note_created", {
        content_length: content.trim().length,
      });

      // Reset and close
      setContent("");
      onSuccess();
      onClose();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create note";
      logger.error("[CreateNoteSheet] Failed to create note", {
        error: errorMessage,
        userId,
      });
      analytics.track("note_creation_failed", {
        error: errorMessage,
      });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      testID="create-note-sheet"
      style={[
        styles.container,
        {
          padding: theme.spacing.lg,
        },
      ]}
    >
      <TText
        variant="heading"
        style={{
          fontSize: theme.typography.fontSize.xl,
          marginBottom: theme.spacing.md,
        }}
      >
        Create Note
      </TText>

      <TInput
        testID="note-content-input"
        placeholder="What's on your mind?"
        value={content}
        onChangeText={setContent}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        error={error || undefined}
        style={{
          minHeight: 120,
        }}
      />

      <TSpacer size="lg" />

      <View style={styles.buttonRow}>
        <TButton
          testID="create-note-cancel"
          variant="ghost"
          onPress={onClose}
          disabled={loading}
          style={{ flex: 1, marginRight: theme.spacing.sm }}
        >
          Cancel
        </TButton>
        <TButton
          testID="create-note-submit"
          variant="primary"
          onPress={handleSave}
          loading={loading}
          disabled={loading || !content.trim()}
          style={{ flex: 1 }}
        >
          Save Note
        </TButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  buttonRow: {
    flexDirection: "row",
    width: "100%",
  },
});
