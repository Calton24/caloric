/**
 * EditMealSheet
 *
 * Bottom-sheet version of the edit meal screen.
 * Accordion is expanded by default, food names are editable,
 * and pencil icons indicate editable fields.
 */

import { Ionicons } from "@expo/vector-icons";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import RNSlider from "@react-native-community/slider";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import type { SavedFoodItem } from "../../features/nutrition/estimation/estimation.types";
import { useNutritionStore } from "../../features/nutrition/nutrition.store";
import { formatDateHeader, useAppTranslation } from "../../infrastructure/i18n";
import { toLocalDateTime } from "../../lib/utils/date";
import { useTheme } from "../../theme/useTheme";
import { TSpacer } from "../primitives/TSpacer";
import { TText } from "../primitives/TText";

interface EditMealSheetProps {
  mealId: string;
  onClose: () => void;
}

export function EditMealSheet({ mealId, onClose }: EditMealSheetProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();

  const meal = useNutritionStore((s) => s.meals.find((m) => m.id === mealId));
  const updateMeal = useNutritionStore((s) => s.updateMeal);
  const removeMeal = useNutritionStore((s) => s.removeMeal);

  const hasItems = (meal?.items?.length ?? 0) > 0;

  const [title, setTitle] = useState(meal?.title ?? "");
  const [calories, setCalories] = useState(meal?.calories ?? 0);
  const [protein, setProtein] = useState(meal?.protein ?? 0);
  const [carbs, setCarbs] = useState(meal?.carbs ?? 0);
  const [fat, setFat] = useState(meal?.fat ?? 0);
  const [items, setItems] = useState<SavedFoodItem[]>(meal?.items ?? []);
  const [loggedAt, setLoggedAt] = useState(meal?.loggedAt ?? "");

  const recalcTotals = useCallback((updatedItems: SavedFoodItem[]) => {
    const totals = updatedItems.reduce(
      (acc, item) => ({
        calories: acc.calories + item.calories,
        protein: Math.round((acc.protein + item.protein) * 10) / 10,
        carbs: Math.round((acc.carbs + item.carbs) * 10) / 10,
        fat: Math.round((acc.fat + item.fat) * 10) / 10,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
    setCalories(totals.calories);
    setProtein(totals.protein);
    setCarbs(totals.carbs);
    setFat(totals.fat);
    const newTitle = updatedItems
      .map((i) => {
        const qty = i.quantity !== 1 ? `${i.quantity} ` : "";
        return `${qty}${i.name}`;
      })
      .join(", ");
    setTitle(newTitle);
  }, []);

  const handleItemQuantityChange = useCallback(
    (index: number, newQuantity: number) => {
      const updated = items.map((item, i) => {
        if (i !== index) return item;
        const scale = item.quantity === 0 ? 1 : newQuantity / item.quantity;
        return {
          ...item,
          quantity: newQuantity,
          calories: Math.round(item.calories * scale),
          protein: Math.round(item.protein * scale * 10) / 10,
          carbs: Math.round(item.carbs * scale * 10) / 10,
          fat: Math.round(item.fat * scale * 10) / 10,
        };
      });
      setItems(updated);
      recalcTotals(updated);
    },
    [items, recalcTotals]
  );

  const handleItemFieldChange = useCallback(
    (
      index: number,
      field: "calories" | "protein" | "carbs" | "fat",
      value: number
    ) => {
      const updated = items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      );
      setItems(updated);
      recalcTotals(updated);
    },
    [items, recalcTotals]
  );

  const handleItemNameChange = useCallback(
    (index: number, newName: string) => {
      const updated = items.map((item, i) =>
        i === index ? { ...item, name: newName } : item
      );
      setItems(updated);
      // Also update the combined title
      const newTitle = updated
        .map((i) => {
          const qty = i.quantity !== 1 ? `${i.quantity} ` : "";
          return `${qty}${i.name}`;
        })
        .join(", ");
      setTitle(newTitle);
    },
    [items]
  );

  const handleRemoveItem = useCallback(
    (index: number) => {
      const updated = items.filter((_, i) => i !== index);
      setItems(updated);
      recalcTotals(updated);
    },
    [items, recalcTotals]
  );

  if (!meal) {
    return (
      <View style={styles.emptyState}>
        <TText
          variant="heading"
          style={[styles.emptyTitle, { color: theme.colors.text }]}
        >
          {t("editMeal.mealNotFound")}
        </TText>
        <TSpacer size="md" />
        <Pressable
          onPress={onClose}
          style={[
            styles.emptyBtn,
            { backgroundColor: theme.colors.surfaceSecondary },
          ]}
        >
          <TText style={[styles.emptyBtnText, { color: theme.colors.primary }]}>
            {t("mealConfirm.goBack")}
          </TText>
        </Pressable>
      </View>
    );
  }

  const hasChanges =
    title !== meal.title ||
    calories !== meal.calories ||
    protein !== meal.protein ||
    carbs !== meal.carbs ||
    fat !== meal.fat ||
    loggedAt !== meal.loggedAt;

  const handleSave = () => {
    const updates: Partial<typeof meal> = {
      title,
      calories,
      protein,
      carbs,
      fat,
    };
    if (hasItems) {
      updates.items = items;
    }
    if (loggedAt !== meal.loggedAt) {
      updates.loggedAt = loggedAt;
    }
    updateMeal(meal.id, updates);
    onClose();
  };

  const handleDelete = () => {
    Alert.alert(
      t("editMeal.deleteMeal"),
      t("editMeal.deleteMealConfirm", { title: meal.title }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("editMeal.delete"),
          style: "destructive",
          onPress: () => {
            removeMeal(meal.id);
            onClose();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TText
          variant="heading"
          style={[styles.headerTitle, { color: theme.colors.text }]}
        >
          {t("editMeal.editMeal")}
        </TText>
        <Pressable onPress={handleDelete} hitSlop={12}>
          <Ionicons name="trash-outline" size={22} color={theme.colors.error} />
        </Pressable>
      </View>

      {/* Meal preview card */}
      <View
        style={[
          styles.previewCard,
          { backgroundColor: theme.colors.surfaceSecondary },
        ]}
      >
        {meal.imageUri ? (
          <Image
            source={{ uri: meal.imageUri }}
            style={styles.mealPhoto}
            contentFit="cover"
            transition={300}
          />
        ) : (
          <TText style={styles.mealIcon}>{meal.emoji ?? "🍽️"}</TText>
        )}
        <TSpacer size="sm" />
        <View style={styles.editableRow}>
          <BottomSheetTextInput
            value={title}
            onChangeText={setTitle}
            style={[styles.titleInput, { color: theme.colors.text }]}
            placeholderTextColor={theme.colors.textMuted}
            placeholder={t("tracking.mealNamePlaceholder")}
          />
          <Ionicons
            name="pencil"
            size={14}
            color={theme.colors.textMuted}
            style={styles.pencilIcon}
          />
        </View>
        <TSpacer size="xs" />
        <View style={styles.sourceRow}>
          <Ionicons
            name={
              meal.source === "voice"
                ? "mic"
                : meal.source === "camera"
                  ? "camera"
                  : "keypad"
            }
            size={14}
            color={theme.colors.textMuted}
          />
          <TText
            style={[styles.sourceLabel, { color: theme.colors.textMuted }]}
          >
            {meal.source === "voice"
              ? t("tracking.voiceLogged")
              : meal.source === "camera"
                ? t("tracking.cameraDetected")
                : t("tracking.manuallyEntered")}
          </TText>
        </View>
        <TSpacer size="xs" />
        {/* Editable date row */}
        <View style={styles.dateRow}>
          <Pressable
            onPress={() => {
              const d = new Date(loggedAt);
              d.setDate(d.getDate() - 1);
              setLoggedAt(toLocalDateTime(d));
            }}
            hitSlop={8}
            style={[
              styles.dateArrow,
              { backgroundColor: theme.colors.border + "60" },
            ]}
          >
            <Ionicons
              name="chevron-back"
              size={14}
              color={theme.colors.textSecondary}
            />
          </Pressable>
          <View style={styles.dateCenter}>
            <Ionicons
              name="calendar-outline"
              size={14}
              color={theme.colors.textMuted}
            />
            <TText
              style={[styles.sourceLabel, { color: theme.colors.textMuted }]}
            >
              {formatDateHeader(new Date(loggedAt))}
              {" · "}
              {loggedAt.split("T")[1]?.slice(0, 5)}
            </TText>
          </View>
          <Pressable
            onPress={() => {
              const d = new Date(loggedAt);
              d.setDate(d.getDate() + 1);
              if (d <= new Date()) {
                setLoggedAt(toLocalDateTime(d));
              }
            }}
            hitSlop={8}
            style={[
              styles.dateArrow,
              { backgroundColor: theme.colors.border + "60" },
            ]}
          >
            <Ionicons
              name="chevron-forward"
              size={14}
              color={theme.colors.textSecondary}
            />
          </Pressable>
        </View>
      </View>

      <TSpacer size="lg" />

      {/* Individual items (when available) */}
      {hasItems && (
        <View>
          <TText
            style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}
          >
            {t("editMeal.items", { count: items.length })}
          </TText>
          <TSpacer size="sm" />

          {items.map((item, index) => (
            <EditableItemCard
              key={`${item.name}-${index}`}
              item={item}
              index={index}
              canRemove={items.length > 1}
              onFieldChange={handleItemFieldChange}
              onQuantityChange={handleItemQuantityChange}
              onNameChange={handleItemNameChange}
              onRemove={handleRemoveItem}
            />
          ))}

          <TSpacer size="md" />

          {/* Totals summary */}
          <View
            style={[
              styles.totalsCard,
              { backgroundColor: theme.colors.surfaceSecondary },
            ]}
          >
            <TText style={[styles.totalsLabel, { color: theme.colors.text }]}>
              {t("editMeal.total")}
            </TText>
            <View style={styles.totalsRow}>
              <TText
                style={[styles.totalsCal, { color: theme.colors.primary }]}
              >
                {Math.round(calories)} {t("tracking.cal")}
              </TText>
              <TText
                style={[
                  styles.totalsMacro,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {t("tracking.macroSummary", {
                  protein: Math.round(protein * 10) / 10,
                  carbs: Math.round(carbs * 10) / 10,
                  fat: Math.round(fat * 10) / 10,
                  unit: t("tracking.g"),
                })}
              </TText>
            </View>
          </View>
        </View>
      )}

      {/* Legacy nutrition editor (no individual items) */}
      {!hasItems && (
        <View>
          <TText
            style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}
          >
            {t("editMeal.nutrition")}
          </TText>
          <TSpacer size="sm" />

          <View
            style={[
              styles.nutritionCard,
              { backgroundColor: theme.colors.surfaceSecondary },
            ]}
          >
            <NutrientRow
              label={t("tracking.calories")}
              value={calories}
              unit={t("tracking.cal")}
              color={theme.colors.primary}
              onChange={setCalories}
            />
            <View
              style={[styles.divider, { backgroundColor: theme.colors.border }]}
            />
            <NutrientRow
              label={t("tracking.protein")}
              value={protein}
              unit={t("tracking.g")}
              color="#60A5FA"
              onChange={setProtein}
            />
            <View
              style={[styles.divider, { backgroundColor: theme.colors.border }]}
            />
            <NutrientRow
              label={t("tracking.carbs")}
              value={carbs}
              unit={t("tracking.g")}
              color="#FBBF24"
              onChange={setCarbs}
            />
            <View
              style={[styles.divider, { backgroundColor: theme.colors.border }]}
            />
            <NutrientRow
              label={t("tracking.fat")}
              value={fat}
              unit={t("tracking.g")}
              color="#F87171"
              onChange={setFat}
            />
          </View>
        </View>
      )}

      <TSpacer size="lg" />

      {/* Delete button (secondary) */}
      <Pressable
        onPress={handleDelete}
        style={[
          styles.deleteBtn,
          { backgroundColor: theme.colors.error + "15" },
        ]}
      >
        <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
        <TText style={[styles.deleteBtnText, { color: theme.colors.error }]}>
          {t("editMeal.deleteMeal")}
        </TText>
      </Pressable>

      <TSpacer size="md" />

      {/* Save button */}
      <Pressable
        onPress={handleSave}
        disabled={!hasChanges}
        style={({ pressed }) => [
          styles.saveBtn,
          {
            opacity: hasChanges ? (pressed ? 0.9 : 1) : 0.4,
            transform: [{ scale: pressed && hasChanges ? 0.98 : 1 }],
          },
        ]}
      >
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.saveGradient}
        >
          <Ionicons
            name="checkmark-circle"
            size={22}
            color={theme.colors.textInverse}
          />
          <TText style={[styles.saveText, { color: theme.colors.textInverse }]}>
            {t("editMeal.saveChanges")}
          </TText>
        </LinearGradient>
      </Pressable>

      <TSpacer size="xxl" />
    </View>
  );
}

// ─── Editable Item Card ────────────────────────────────────
function EditableItemCard({
  item,
  index,
  canRemove,
  onFieldChange,
  onQuantityChange,
  onNameChange,
  onRemove,
}: {
  item: SavedFoodItem;
  index: number;
  canRemove: boolean;
  onFieldChange: (
    index: number,
    field: "calories" | "protein" | "carbs" | "fat",
    value: number
  ) => void;
  onQuantityChange: (index: number, newQuantity: number) => void;
  onNameChange: (index: number, newName: string) => void;
  onRemove: (index: number) => void;
}) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const [expanded, setExpanded] = useState(true);

  const originalQty = useRef(item.quantity).current;
  const sliderMin = 0.25;
  const sliderMax = Math.max(originalQty * 5, 5);
  const isGrams = item.unit === "g" || item.unit === "grams";
  const step = isGrams ? 10 : 0.25;

  const formatQty = (q: number) => {
    if (isGrams) return `${Math.round(q)}g`;
    if (q === Math.floor(q)) return String(q);
    return q.toFixed(2).replace(/0$/, "");
  };

  return (
    <Animated.View
      exiting={FadeOut.duration(200)}
      style={[
        styles.itemCard,
        { backgroundColor: theme.colors.surfaceSecondary },
      ]}
    >
      {/* Item header — tap to expand/collapse */}
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={styles.itemHeader}
      >
        <TText style={styles.itemEmoji}>{item.emoji ?? "🍽️"}</TText>
        <View style={styles.itemInfo}>
          <View style={styles.editableNameRow}>
            <BottomSheetTextInput
              value={item.name}
              onChangeText={(text) => onNameChange(index, text)}
              style={[styles.itemNameInput, { color: theme.colors.text }]}
              numberOfLines={1}
            />
            <Ionicons name="pencil" size={12} color={theme.colors.textMuted} />
          </View>
          <TText
            style={[styles.itemCals, { color: theme.colors.textSecondary }]}
          >
            {Math.round(item.calories)} {t("tracking.cal")}
          </TText>
        </View>
        <View style={styles.itemActions}>
          {canRemove && (
            <Pressable
              onPress={() => onRemove(index)}
              hitSlop={10}
              style={styles.itemRemoveBtn}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={theme.colors.error}
              />
            </Pressable>
          )}
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={theme.colors.textMuted}
          />
        </View>
      </Pressable>

      {/* Portion slider — always visible */}
      <View style={styles.sliderContainer}>
        <View style={styles.sliderLabelRow}>
          <TText
            style={[styles.sliderLabel, { color: theme.colors.textSecondary }]}
          >
            {isGrams ? t("editMeal.amount") : t("editMeal.servings")}
          </TText>
          <TText style={[styles.sliderValue, { color: theme.colors.primary }]}>
            {formatQty(item.quantity)}
            {!isGrams ? ` ${item.unit}` : ""}
          </TText>
        </View>
        <RNSlider
          value={item.quantity}
          minimumValue={isGrams ? step : sliderMin}
          maximumValue={isGrams ? Math.max(originalQty * 3, 500) : sliderMax}
          step={step}
          minimumTrackTintColor={theme.colors.primary}
          maximumTrackTintColor={theme.colors.border}
          thumbTintColor={theme.colors.primary}
          onValueChange={(v) => onQuantityChange(index, v)}
          style={styles.slider}
        />
        <View style={styles.sliderEndLabels}>
          <TText
            style={[styles.sliderEndLabel, { color: theme.colors.textMuted }]}
          >
            {isGrams ? `${step}g` : sliderMin}
          </TText>
          <TText
            style={[styles.sliderEndLabel, { color: theme.colors.textMuted }]}
          >
            {isGrams ? `${Math.max(originalQty * 3, 500)}g` : sliderMax}
          </TText>
        </View>
      </View>

      {/* Expanded nutrients editor */}
      {expanded && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.itemBody}>
          <View
            style={[
              styles.divider,
              { backgroundColor: theme.colors.border, marginHorizontal: 0 },
            ]}
          />
          <NutrientRow
            label={t("tracking.calories")}
            value={item.calories}
            unit={t("tracking.cal")}
            color={theme.colors.primary}
            onChange={(v) => onFieldChange(index, "calories", v)}
          />
          <NutrientRow
            label={t("tracking.protein")}
            value={item.protein}
            unit={t("tracking.g")}
            color="#60A5FA"
            onChange={(v) => onFieldChange(index, "protein", v)}
          />
          <NutrientRow
            label={t("tracking.carbs")}
            value={item.carbs}
            unit={t("tracking.g")}
            color="#FBBF24"
            onChange={(v) => onFieldChange(index, "carbs", v)}
          />
          <NutrientRow
            label={t("tracking.fat")}
            value={item.fat}
            unit={t("tracking.g")}
            color="#F87171"
            onChange={(v) => onFieldChange(index, "fat", v)}
          />
        </Animated.View>
      )}
    </Animated.View>
  );
}

// ─── Nutrient Row ──────────────────────────────────────────
function NutrientRow({
  label,
  value,
  unit,
  color,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
  onChange: (value: number) => void;
}) {
  const { theme } = useTheme();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(String(value));

  const handleEndEditing = () => {
    const parsed = parseFloat(text);
    if (!isNaN(parsed) && parsed >= 0) {
      onChange(Math.round(parsed));
    } else {
      setText(String(value));
    }
    setEditing(false);
  };

  return (
    <View style={styles.nutrientRow}>
      <View style={[styles.nutrientDot, { backgroundColor: color }]} />
      <TText style={[styles.nutrientLabel, { color: theme.colors.text }]}>
        {label}
      </TText>
      <Pressable onPress={() => setEditing(true)} style={styles.nutrientValue}>
        {editing ? (
          <BottomSheetTextInput
            value={text}
            onChangeText={setText}
            onEndEditing={handleEndEditing}
            onBlur={handleEndEditing}
            keyboardType="numeric"
            autoFocus
            style={[styles.nutrientInput, { color: theme.colors.text }]}
          />
        ) : (
          <>
            <TText
              style={[styles.nutrientNumber, { color: theme.colors.text }]}
            >
              {value}
            </TText>
            <Ionicons
              name="pencil"
              size={10}
              color={theme.colors.textMuted}
              style={{ marginLeft: 4, marginRight: 2 }}
            />
          </>
        )}
        <TText style={[styles.nutrientUnit, { color: theme.colors.textMuted }]}>
          {unit}
        </TText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  previewCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  mealIcon: {
    fontSize: 48,
  },
  mealPhoto: {
    width: 80,
    height: 80,
    borderRadius: 16,
  },
  editableRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  titleInput: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    minWidth: 200,
  },
  pencilIcon: {
    marginTop: 2,
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dateCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateArrow: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  sourceLabel: {
    fontSize: 13,
    fontWeight: "400",
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  nutritionCard: {
    borderRadius: 14,
    padding: 4,
  },
  nutrientRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  nutrientDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  nutrientLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  nutrientValue: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  nutrientNumber: {
    fontSize: 18,
    fontWeight: "700",
  },
  nutrientInput: {
    fontSize: 18,
    fontWeight: "700",
    minWidth: 50,
    textAlign: "right",
    borderBottomWidth: 1,
    borderBottomColor: "#60A5FA",
    paddingBottom: 2,
  },
  nutrientUnit: {
    fontSize: 13,
    fontWeight: "400",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  deleteBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
  saveBtn: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  saveGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  saveText: {
    fontSize: 17,
    fontWeight: "700",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
  },
  emptyBtn: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
  },
  emptyBtnText: {
    fontSize: 16,
    fontWeight: "600",
  },
  // ─── Item card styles ───
  itemCard: {
    borderRadius: 14,
    marginBottom: 10,
    overflow: "hidden",
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  itemEmoji: {
    fontSize: 28,
  },
  itemInfo: {
    flex: 1,
  },
  editableNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  itemNameInput: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
    padding: 0,
  },
  itemCals: {
    fontSize: 13,
    fontWeight: "400",
    marginTop: 2,
  },
  itemActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  itemRemoveBtn: {
    padding: 2,
  },
  itemBody: {
    paddingHorizontal: 4,
    paddingBottom: 6,
  },
  // ─── Slider styles ───
  sliderContainer: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  sliderLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  sliderLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  sliderValue: {
    fontSize: 15,
    fontWeight: "700",
  },
  slider: {
    width: "100%",
    height: 36,
  },
  sliderEndLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -4,
  },
  sliderEndLabel: {
    fontSize: 11,
    fontWeight: "400",
  },
  // ─── Totals card styles ───
  totalsCard: {
    borderRadius: 14,
    padding: 16,
  },
  totalsLabel: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
  },
  totalsRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 12,
  },
  totalsCal: {
    fontSize: 20,
    fontWeight: "700",
  },
  totalsMacro: {
    fontSize: 13,
    fontWeight: "400",
  },
});
