/**
 * WaterSettingsModal
 *
 * Bottom-sheet-style modal for configuring:
 *  - Serving size (ml per tap) via a drum/scroll picker
 *  - Daily water goal via a drum/scroll picker
 *
 * On "Save": updates the Zustand profile store and fires an async
 * Supabase upsert (fire-and-forget, with silent failure).
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Dimensions,
    FlatList,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useProfileStore } from "../../features/profile/profile.store";
import { pushProfile } from "../../features/sync/sync.service";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";

// ─── Picker options ───────────────────────────────────────────────────────────
const SERVING_OPTIONS = [150, 200, 250, 330, 500, 750, 1000, 1250];
const GOAL_OPTIONS = [1000, 1500, 2000, 2500, 3000, 3500, 4000];

const ITEM_HEIGHT = 56;
const VISIBLE_ITEMS = 3; // odd number so selection is centred
const WINDOW_H = Dimensions.get("window").height;

interface Props {
  visible: boolean;
  onClose: () => void;
}

// ─── Drum Picker ─────────────────────────────────────────────────────────────
interface DrumPickerProps {
  options: number[];
  selected: number;
  onSelect: (value: number) => void;
  formatOption?: (v: number) => string;
}

function DrumPicker({
  options,
  selected,
  onSelect,
  formatOption,
}: DrumPickerProps) {
  const { theme } = useTheme();
  const isDark = theme.mode === "dark";
  const listRef = useRef<FlatList>(null);
  // Track what the user is looking at (for visual highlight during scroll)
  const [centeredValue, setCenteredValue] = useState(selected);
  const userScrolling = useRef(false);

  const formatVal = formatOption ?? ((v: number) => `${v}`);
  const PADDING = ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2);
  const CONTAINER_H = ITEM_HEIGHT * VISIBLE_ITEMS;

  // Scroll to `selected` when the parent commits a new value (modal open / external change)
  useEffect(() => {
    if (userScrolling.current) return;
    const idx = options.indexOf(selected);
    if (idx < 0) return;
    setCenteredValue(selected);
    setTimeout(() => {
      listRef.current?.scrollToOffset({
        offset: idx * ITEM_HEIGHT,
        animated: false,
      });
    }, 120);
  }, [selected, options]);

  /** Derive selected value from scroll offset — reliable, no viewability guessing */
  const commitFromOffset = (y: number) => {
    const idx = Math.max(
      0,
      Math.min(Math.round(y / ITEM_HEIGHT), options.length - 1)
    );
    const val = options[idx];
    setCenteredValue(val);
    onSelect(val);
  };

  const SEL_BG = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";

  return (
    <View style={[styles.pickerContainer, { height: CONTAINER_H }]}>
      {/* Selection highlight band */}
      <View
        pointerEvents="none"
        style={[
          styles.selectionBand,
          {
            top: PADDING,
            height: ITEM_HEIGHT,
            backgroundColor: SEL_BG,
          },
        ]}
      />
      {/* Top fade */}
      <View
        pointerEvents="none"
        style={[
          styles.fade,
          styles.fadeTop,
          {
            backgroundColor: isDark
              ? "rgba(28,28,30,0.85)"
              : "rgba(255,255,255,0.85)",
          },
        ]}
      />
      {/* Bottom fade */}
      <View
        pointerEvents="none"
        style={[
          styles.fade,
          styles.fadeBottom,
          {
            backgroundColor: isDark
              ? "rgba(28,28,30,0.85)"
              : "rgba(255,255,255,0.85)",
          },
        ]}
      />

      <FlatList
        ref={listRef}
        data={options}
        keyExtractor={(item) => String(item)}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingVertical: PADDING,
        }}
        getItemLayout={(_, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
        onScrollBeginDrag={() => {
          userScrolling.current = true;
        }}
        onMomentumScrollEnd={(e) => {
          userScrolling.current = false;
          commitFromOffset(e.nativeEvent.contentOffset.y);
        }}
        onScrollEndDrag={(e) => {
          // Handles fling-less drag releases
          commitFromOffset(e.nativeEvent.contentOffset.y);
        }}
        renderItem={({ item }) => {
          const isSelected = item === centeredValue;
          return (
            <Pressable
              style={styles.pickerItem}
              onPress={() => {
                const idx = options.indexOf(item);
                listRef.current?.scrollToOffset({
                  offset: idx * ITEM_HEIGHT,
                  animated: true,
                });
                setCenteredValue(item);
                onSelect(item);
              }}
            >
              <TText
                style={[
                  styles.pickerItemText,
                  {
                    color: isSelected
                      ? theme.colors.text
                      : theme.colors.textMuted,
                    fontWeight: isSelected ? "600" : "400",
                    fontSize: isSelected ? 22 : 18,
                  },
                ]}
              >
                {formatVal(item)}
              </TText>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export function WaterSettingsModal({ visible, onClose }: Props) {
  const { theme } = useTheme();
  const isDark = theme.mode === "dark";
  const insets = useSafeAreaInsets();

  const profile = useProfileStore((s) => s.profile);
  const setWaterSettings = useProfileStore((s) => s.setWaterSettings);

  const [servingMl, setServingMl] = useState(profile.waterIncrementMl);
  const [goalMl, setGoalMl] = useState(profile.waterGoalMl);
  const [saving, setSaving] = useState(false);

  // Sync local state when modal opens
  useEffect(() => {
    if (visible) {
      setServingMl(profile.waterIncrementMl);
      setGoalMl(profile.waterGoalMl);
    }
  }, [visible, profile.waterIncrementMl, profile.waterGoalMl]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    // 1. Update local store immediately (fast, offline-first)
    setWaterSettings(goalMl, servingMl);
    // 2. Push to Supabase async (fire-and-forget)
    const updatedProfile = {
      ...profile,
      waterGoalMl: goalMl,
      waterIncrementMl: servingMl,
    };
    pushProfile(updatedProfile).catch(() => {
      // Silently ignored — local state is the source of truth
    });
    setSaving(false);
    onClose();
  }, [goalMl, servingMl, profile, setWaterSettings, onClose]);

  const BG = isDark ? "#1C1C1E" : "#FFFFFF";
  const BORDER = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: BG,
              maxHeight: WINDOW_H * 0.9,
              paddingBottom: insets.bottom + 8,
            },
          ]}
          onPress={() => {}}
        >
          {/* Handle bar */}
          <View
            style={[
              styles.handle,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.2)"
                  : "rgba(0,0,0,0.15)",
              },
            ]}
          />

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: BORDER }]}>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <TText
                style={[
                  styles.closeBtnText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                ✕
              </TText>
            </Pressable>
            <TText style={[styles.title, { color: theme.colors.text }]}>
              Water settings
            </TText>
            <View style={styles.closeBtn} />
          </View>

          {/* Scrollable body */}
          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            {/* Serving size row */}
            <View style={[styles.row, { borderBottomColor: BORDER }]}>
              <TText style={[styles.rowLabel, { color: theme.colors.text }]}>
                Serving size
              </TText>
              <TText
                style={[styles.rowValue, { color: theme.colors.textSecondary }]}
              >
                {servingMl >= 1000
                  ? `${(servingMl / 1000).toFixed(servingMl % 1000 === 0 ? 0 : 1)} L`
                  : `${servingMl} ml`}
                {"  ✏️"}
              </TText>
            </View>

            {/* Serving size picker */}
            <DrumPicker
              options={SERVING_OPTIONS}
              selected={servingMl}
              onSelect={setServingMl}
              formatOption={(v) => v.toLocaleString()}
            />

            {/* Daily goal picker label */}
            <View
              style={[
                styles.row,
                {
                  borderBottomColor: BORDER,
                  borderTopColor: BORDER,
                  borderTopWidth: StyleSheet.hairlineWidth,
                },
              ]}
            >
              <TText style={[styles.rowLabel, { color: theme.colors.text }]}>
                Daily goal
              </TText>
              <TText
                style={[styles.rowValue, { color: theme.colors.textSecondary }]}
              >
                {goalMl >= 1000
                  ? `${(goalMl / 1000).toFixed(goalMl % 1000 === 0 ? 0 : 1)} L`
                  : `${goalMl} ml`}
                {"  ✏️"}
              </TText>
            </View>

            {/* Daily goal picker */}
            <DrumPicker
              options={GOAL_OPTIONS}
              selected={goalMl}
              onSelect={setGoalMl}
              formatOption={(v) => `${(v / 1000).toFixed(1)} L`}
            />

            {/* Info text */}
            <View style={styles.infoBox}>
              <TText style={[styles.infoTitle, { color: theme.colors.text }]}>
                How much water do you need to stay hydrated?
              </TText>
              <TText
                style={[styles.infoBody, { color: theme.colors.textSecondary }]}
              >
                {
                  "Everyone's needs are slightly different, but we recommend aiming for at least 2,000 ml (2 L) of water each day."
                }
              </TText>
            </View>
          </ScrollView>

          {/* Cancel + Save buttons — always visible at bottom */}
          <View
            style={[
              styles.buttons,
              {
                borderTopColor: BORDER,
                borderTopWidth: StyleSheet.hairlineWidth,
              },
            ]}
          >
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.btnCancel,
                { borderColor: BORDER, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <TText
                style={[styles.btnCancelText, { color: theme.colors.text }]}
              >
                Cancel
              </TText>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={({ pressed }) => [
                styles.btnSave,
                {
                  backgroundColor: isDark ? "#FFFFFF" : "#000000",
                  opacity: pressed || saving ? 0.8 : 1,
                },
              ]}
            >
              <TText
                style={[
                  styles.btnSaveText,
                  { color: isDark ? "#000000" : "#FFFFFF" },
                ]}
              >
                {saving ? "Saving…" : "Save"}
              </TText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: {
    fontSize: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  rowValue: {
    fontSize: 16,
  },
  // ── Drum picker ──
  pickerContainer: {
    overflow: "hidden",
    position: "relative",
  },
  selectionBand: {
    position: "absolute",
    left: 0,
    right: 0,
    borderRadius: 10,
    marginHorizontal: 16,
    zIndex: 0,
  },
  fade: {
    position: "absolute",
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * 2,
    zIndex: 1,
    pointerEvents: "none",
  } as any,
  fadeTop: {
    top: 0,
  },
  fadeBottom: {
    bottom: 0,
  },
  pickerItem: {
    height: ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerItemText: {
    letterSpacing: 0.3,
  },
  // ── Info ──
  infoBox: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
  },
  infoBody: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  // ── Buttons ──
  buttons: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
  },
  btnCancelText: {
    fontSize: 16,
    fontWeight: "600",
  },
  btnSave: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  btnSaveText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
