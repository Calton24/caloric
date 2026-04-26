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
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useProfileStore } from "../../features/profile/profile.store";
import { pushProfile } from "../../features/sync/sync.service";
import { haptics } from "../../infrastructure/haptics/haptics";
import { useAppTranslation } from "../../infrastructure/i18n/useAppTranslation";
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
  const scrollRef = useRef<ScrollView>(null);
  const [centeredValue, setCenteredValue] = useState(selected);
  const userScrolling = useRef(false);
  const lastHapticIdx = useRef(-1);

  const formatVal = formatOption ?? ((v: number) => `${v}`);
  const PADDING = ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2);
  const CONTAINER_H = ITEM_HEIGHT * VISIBLE_ITEMS;

  // Scroll to `selected` when the parent commits a new value (modal open / external change)
  useEffect(() => {
    if (userScrolling.current) return;
    const idx = options.indexOf(selected);
    if (idx < 0) return;
    setCenteredValue(selected);
    lastHapticIdx.current = idx;
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: idx * ITEM_HEIGHT,
        animated: false,
      });
    }, 120);
  }, [selected, options]);

  /** Fire haptic tick during live scroll when crossing item boundaries */
  const handleScroll = useCallback(
    (e: any) => {
      const y = e.nativeEvent.contentOffset.y;
      const idx = Math.max(
        0,
        Math.min(Math.round(y / ITEM_HEIGHT), options.length - 1)
      );
      if (idx !== lastHapticIdx.current) {
        lastHapticIdx.current = idx;
        haptics.selection();
      }
    },
    [options.length]
  );

  /** Derive selected value from scroll offset */
  const commitFromOffset = (y: number) => {
    const idx = Math.max(
      0,
      Math.min(Math.round(y / ITEM_HEIGHT), options.length - 1)
    );
    const val = options[idx];
    if (val !== centeredValue) {
      haptics.selection();
    }
    setCenteredValue(val);
    onSelect(val);
  };

  const SEL_BG = isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.10)";

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
              ? theme.colors.surface + "D9"
              : theme.colors.surface + "D9",
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
              ? theme.colors.surface + "D9"
              : theme.colors.surface + "D9",
          },
        ]}
      />

      <ScrollView
        ref={scrollRef}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: PADDING }}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onScrollBeginDrag={() => {
          userScrolling.current = true;
        }}
        onMomentumScrollEnd={(e) => {
          userScrolling.current = false;
          commitFromOffset(e.nativeEvent.contentOffset.y);
        }}
        onScrollEndDrag={(e) => {
          commitFromOffset(e.nativeEvent.contentOffset.y);
        }}
      >
        {options.map((item) => {
          const isSelected = item === centeredValue;
          return (
            <Pressable
              key={item}
              style={styles.pickerItem}
              onPress={() => {
                const idx = options.indexOf(item);
                scrollRef.current?.scrollTo({
                  y: idx * ITEM_HEIGHT,
                  animated: true,
                });
                haptics.selection();
                setCenteredValue(item);
                onSelect(item);
              }}
            >
              <TText
                style={[
                  styles.pickerItemText,
                  {
                    color: isSelected
                      ? isDark
                        ? "#FFFFFF"
                        : theme.colors.text
                      : theme.colors.textSecondary,
                    fontWeight: isSelected ? "700" : "400",
                    fontSize: isSelected ? 22 : 18,
                  },
                ]}
              >
                {formatVal(item)}
              </TText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export function WaterSettingsModal({ visible, onClose }: Props) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
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

  const BG = theme.colors.surface;
  const BORDER = theme.colors.border;

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
                  ? "rgba(255,255,255,0.25)"
                  : "rgba(0,0,0,0.18)",
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
              {t("settings.waterSettings")}
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
                {t("settings.servingSize")}
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
                {t("settings.dailyGoalLabel")}
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
                {t("settings.hydrationTitle")}
              </TText>
              <TText
                style={[styles.infoBody, { color: theme.colors.textSecondary }]}
              >
                {t("settings.hydrationBody")}
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
                {
                  borderColor: theme.colors.border,
                  backgroundColor: isDark
                    ? theme.colors.surfaceSecondary
                    : theme.colors.backgroundSecondary,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <TText
                style={[styles.btnCancelText, { color: theme.colors.text }]}
              >
                {t("common.cancel")}
              </TText>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={({ pressed }) => [
                styles.btnSave,
                {
                  backgroundColor: theme.colors.primary,
                  opacity: pressed || saving ? 0.8 : 1,
                },
              ]}
            >
              <TText style={[styles.btnSaveText, { color: "#FFFFFF" }]}>
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
    height: ITEM_HEIGHT,
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
