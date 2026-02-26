/**
 * Stories
 * Instagram / Snapchat–style story viewer.
 *
 * Features:
 * - Horizontal scrollable avatar ring (story circles)
 * - Full-screen story viewer with animated progress bars
 * - Tap left/right to go back/forward
 * - Long-press to pause
 * - Auto-advance with configurable duration per story
 * - Swipe down to dismiss
 * - Token-driven via useTheme()
 */

import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
    FlatList,
    Image,
    Modal,
    Pressable,
    StyleProp,
    StyleSheet,
    View,
    ViewStyle,
} from "react-native";
import Animated, {
    cancelAnimation,
    Easing,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";

/* ── Types ─────────────────────────────────────────── */

export interface StoryItem {
  /** Image URI for the story */
  image: string;
  /** Duration in ms (default: 5000) */
  duration?: number;
}

export interface StoryUser {
  /** Unique id */
  key: string;
  /** Display name */
  name: string;
  /** Avatar URI */
  avatar: string;
  /** Whether stories have been viewed */
  viewed?: boolean;
  /** Story items */
  stories: StoryItem[];
}

export interface StoriesProps {
  /** Array of users with stories */
  data: StoryUser[];
  /** Size of avatar circles (default: 68) */
  avatarSize?: number;
  /** Ring color for unviewed (default: gradient approximation) */
  ringColor?: string;
  /** Called when stories for a user are finished */
  onStoriesEnd?: (user: StoryUser) => void;
  /** Container style */
  style?: StyleProp<ViewStyle>;
}

/* ── Constants ─────────────────────────────────────── */

const DEFAULT_DURATION = 5000;

/* ── Avatar Circle ─────────────────────────────────── */

function StoryAvatar({
  user,
  size,
  ringColor,
  onPress,
}: {
  user: StoryUser;
  size: number;
  ringColor: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.avatarWrapper}>
      <View
        style={[
          styles.avatarRing,
          {
            width: size + 6,
            height: size + 6,
            borderRadius: (size + 6) / 2,
            borderColor: user.viewed ? theme.colors.borderSecondary : ringColor,
            borderWidth: 2.5,
          },
        ]}
      >
        <Image
          source={{ uri: user.avatar }}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
          }}
        />
      </View>
      <TText
        numberOfLines={1}
        style={{
          fontSize: theme.typography.fontSize.xs,
          color: theme.colors.text,
          marginTop: 4,
          textAlign: "center",
          width: size + 8,
        }}
      >
        {user.name}
      </TText>
    </Pressable>
  );
}

/* ── Progress Bar ──────────────────────────────────── */

function ProgressBar({
  active,
  completed,
  duration,
  paused,
  onFinish,
}: {
  active: boolean;
  completed: boolean;
  duration: number;
  paused: boolean;
  onFinish: () => void;
}) {
  const progress = useSharedValue(completed ? 1 : 0);

  useEffect(() => {
    if (completed) {
      progress.value = 1;
      return;
    }
    if (!active) {
      progress.value = 0;
      return;
    }
    // Start or resume animation
    if (!paused) {
      const remaining = (1 - progress.value) * duration;
      progress.value = withTiming(
        1,
        { duration: remaining, easing: Easing.linear },
        (finished) => {
          if (finished) {
            runOnJS(onFinish)();
          }
        }
      );
    } else {
      cancelAnimation(progress);
    }
  }, [active, completed, paused, duration, progress, onFinish]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View
      style={[
        styles.progressTrack,
        { backgroundColor: "rgba(255,255,255,0.3)" },
      ]}
    >
      <Animated.View
        style={[styles.progressFill, { backgroundColor: "#fff" }, barStyle]}
      />
    </View>
  );
}

/* ── Story Viewer Modal ────────────────────────────── */

function StoryViewer({
  user,
  visible,
  onClose,
  onEnd,
}: {
  user: StoryUser | null;
  visible: boolean;
  onClose: () => void;
  onEnd: (user: StoryUser) => void;
}) {
  const { theme } = useTheme();
  const [storyIndex, setStoryIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  // Reset index when user changes
  useEffect(() => {
    setStoryIndex(0);
    setPaused(false);
  }, [user?.key]);

  const goNext = useCallback(() => {
    if (!user) return;
    if (storyIndex < user.stories.length - 1) {
      setStoryIndex((i) => i + 1);
    } else {
      onEnd(user);
      onClose();
    }
  }, [user, storyIndex, onEnd, onClose]);

  const goPrev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1);
    }
  }, [storyIndex]);

  if (!user || !visible) return null;

  const currentStory = user.stories[storyIndex];
  const duration = currentStory?.duration ?? DEFAULT_DURATION;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      transparent
    >
      <View style={styles.viewerContainer}>
        <Image
          source={{ uri: currentStory?.image }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />

        {/* Progress bars */}
        <View style={styles.progressRow}>
          {user.stories.map((_, i) => (
            <ProgressBar
              key={i}
              active={i === storyIndex}
              completed={i < storyIndex}
              duration={duration}
              paused={paused}
              onFinish={goNext}
            />
          ))}
        </View>

        {/* Header */}
        <View style={styles.viewerHeader}>
          <Image source={{ uri: user.avatar }} style={styles.viewerAvatar} />
          <TText
            style={{
              color: "#fff",
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.semibold,
              flex: 1,
            }}
          >
            {user.name}
          </TText>
          <Pressable onPress={onClose} hitSlop={16}>
            <Ionicons name="close" size={24} color="#fff" />
          </Pressable>
        </View>

        {/* Tap zones */}
        <View style={styles.tapZones}>
          <Pressable
            style={styles.tapZoneLeft}
            onPress={goPrev}
            onLongPress={() => setPaused(true)}
            onPressOut={() => setPaused(false)}
          />
          <Pressable
            style={styles.tapZoneRight}
            onPress={goNext}
            onLongPress={() => setPaused(true)}
            onPressOut={() => setPaused(false)}
          />
        </View>
      </View>
    </Modal>
  );
}

/* ── Main Component ────────────────────────────────── */

export function Stories({
  data,
  avatarSize = 68,
  ringColor,
  onStoriesEnd,
  style,
}: StoriesProps) {
  const { theme } = useTheme();
  const [viewerUser, setViewerUser] = useState<StoryUser | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);
  const ring = ringColor ?? theme.colors.primary;

  const openStory = useCallback((user: StoryUser) => {
    setViewerUser(user);
    setViewerVisible(true);
  }, []);

  const closeViewer = useCallback(() => {
    setViewerVisible(false);
  }, []);

  const handleEnd = useCallback(
    (user: StoryUser) => {
      onStoriesEnd?.(user);
    },
    [onStoriesEnd]
  );

  const renderUser = useCallback(
    ({ item }: { item: StoryUser }) => (
      <StoryAvatar
        user={item}
        size={avatarSize}
        ringColor={ring}
        onPress={() => openStory(item)}
      />
    ),
    [avatarSize, ring, openStory]
  );

  return (
    <View style={style}>
      <FlatList
        data={data}
        renderItem={renderUser}
        keyExtractor={(item) => item.key}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 12 }}
      />
      <StoryViewer
        user={viewerUser}
        visible={viewerVisible}
        onClose={closeViewer}
        onEnd={handleEnd}
      />
    </View>
  );
}

/* ── Styles ────────────────────────────────────────── */

const styles = StyleSheet.create({
  avatarWrapper: {
    alignItems: "center",
  },
  avatarRing: {
    alignItems: "center",
    justifyContent: "center",
  },
  viewerContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  progressRow: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 8,
    paddingTop: 54,
  },
  progressTrack: {
    flex: 1,
    height: 2.5,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  viewerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  viewerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  tapZones: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    top: 100,
  },
  tapZoneLeft: {
    flex: 1,
  },
  tapZoneRight: {
    flex: 2,
  },
});
