/**
 * NotesScreen - VALIDATION HARNESS (Dev Only)
 *
 * This feature validates Mobile Core infrastructure under real pressure:
 * - Auth: Requires authenticated user
 * - Database: CRUD operations with Supabase
 * - Realtime: Broadcast channel subscriptions
 * - Analytics: Event tracking
 * - Logger: Error handling
 * - Flags: Feature flag integration
 * - ErrorBoundary: Crash protection
 * - Bottom Sheets: Modal interaction
 * - Theme: Dynamic styling
 *
 * Gated to __DEV__ mode only (see app/(tabs)/_layout.tsx)
 * Never ships in production builds.
 */

import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { analytics } from "../../analytics/analytics";
import { flags } from "../../flags/flags";
import { ErrorBoundary } from "../../infrastructure/errorReporting";
import { logger } from "../../logging/logger";
import { useTheme } from "../../theme/useTheme";
import { GlassCard } from "../../ui/glass/GlassCard";
import { TButton } from "../../ui/primitives/TButton";
import { TSpacer } from "../../ui/primitives/TSpacer";
import { TText } from "../../ui/primitives/TText";
import { useBottomSheet } from "../../ui/sheets/useBottomSheet";
import { useAuth } from "../auth/useAuth";
import { CreateNoteSheet } from "./CreateNoteSheet";
import {
    fetchNotes,
    subscribeToNotes,
    unsubscribeFromNotes,
} from "./notes.service";
import type { Note } from "./notes.types";

function NotesScreenContent() {
  const { theme } = useTheme();
  const { open: openSheet, close: closeSheet } = useBottomSheet();
  const { user: authUser, isLoading: authLoading } = useAuth();

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const userId = authUser?.id ?? null;

  // Feature flag check
  const canCreateNotes = flags.isEnabled("notes.create", true);

  // Load notes when user becomes available
  useEffect(() => {
    if (authLoading) return;

    if (!userId) {
      setNotes([]);
      setLoading(false);
      return;
    }

    const loadNotes = async () => {
      setLoading(true);
      try {
        // Track screen view
        analytics.track("notes_screen_viewed", {
          user_id: userId,
        });

        // Fetch initial notes
        const initialNotes = await fetchNotes(userId);
        setNotes(initialNotes);
      } catch (error) {
        logger.error("[NotesScreen] Failed to initialize", {
          error: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setLoading(false);
      }
    };

    loadNotes();
  }, [userId, authLoading]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!userId) return;

    try {
      subscribeToNotes((newNote) => {
        // Only add if from different user or different session
        setNotes((prev) => {
          const exists = prev.some((note) => note.id === newNote.id);
          if (exists) return prev;
          return [newNote, ...prev];
        });
      });
    } catch (error) {
      logger.error("[NotesScreen] Realtime subscription failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        user_id: userId,
      });
    }

    return () => {
      unsubscribeFromNotes();
    };
  }, [userId]);

  // Refresh handler
  const handleRefresh = async () => {
    if (!userId) return;

    setRefreshing(true);
    try {
      const refreshedNotes = await fetchNotes(userId);
      setNotes(refreshedNotes);
    } catch (error) {
      logger.error("[NotesScreen] Failed to refresh", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Open create note sheet
  const handleCreateNote = () => {
    if (!userId) return;

    openSheet(
      <CreateNoteSheet
        userId={userId}
        onSuccess={handleRefresh}
        onClose={closeSheet}
      />,
      {
        snapPoints: ["70%"],
        enablePanDownToClose: true,
      }
    );
  };

  // Format date helper
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  // Render note card
  const renderNote = ({ item }: { item: Note }) => (
    <GlassCard
      intensity="medium"
      style={{
        marginBottom: theme.spacing.md,
      }}
    >
      <TText
        variant="body"
        style={{
          fontSize: theme.typography.fontSize.base,
          lineHeight: 24,
          marginBottom: theme.spacing.sm,
        }}
      >
        {item.content}
      </TText>
      <TText
        variant="caption"
        color="secondary"
        style={{
          fontSize: theme.typography.fontSize.sm,
        }}
      >
        {formatDate(item.created_at)}
      </TText>
    </GlassCard>
  );

  // Not authenticated
  if (!loading && !authLoading && !userId) {
    return (
      <SafeAreaView
        style={[
          styles.centered,
          {
            backgroundColor: theme.colors.background,
          },
        ]}
        edges={["top"]}
      >
        <TText variant="body" color="secondary">
          Not signed in
        </TText>
      </SafeAreaView>
    );
  }

  // Loading state
  if (loading) {
    return (
      <SafeAreaView
        style={[
          styles.centered,
          {
            backgroundColor: theme.colors.background,
          },
        ]}
        edges={["top"]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      testID="notes-screen"
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
        },
      ]}
      edges={["top"]}
    >
      <View
        style={[
          styles.header,
          {
            padding: theme.spacing.lg,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <TText
          variant="heading"
          style={{
            fontSize: theme.typography.fontSize.xxl,
          }}
        >
          Notes
        </TText>
        <TSpacer size="md" />
        {canCreateNotes && (
          <TButton
            testID="create-note-button"
            variant="primary"
            onPress={handleCreateNote}
          >
            Create Note
          </TButton>
        )}
      </View>

      <FlatList
        testID="notes-list"
        data={notes}
        renderItem={renderNote}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          padding: theme.spacing.lg,
        }}
        ListEmptyComponent={
          <View style={styles.centered}>
            <TText variant="body" color="secondary">
              No notes yet. {canCreateNotes ? "Create your first one!" : ""}
            </TText>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
      />
    </SafeAreaView>
  );
}

/**
 * NotesScreen wrapped with ErrorBoundary
 * Validates error handling infrastructure
 */
export function NotesScreen() {
  const { theme } = useTheme();

  return (
    <ErrorBoundary
      fallback={
        <SafeAreaView
          style={[
            styles.centered,
            {
              backgroundColor: theme.colors.background,
            },
          ]}
          edges={["top"]}
        >
          <TText variant="body" color="secondary">
            Something went wrong
          </TText>
        </SafeAreaView>
      }
    >
      <NotesScreenContent />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    width: "100%",
  },
});
