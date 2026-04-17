/**
 * Edit Meal Screen
 *
 * Allows editing an existing logged meal's title, calories, and macros.
 * When the meal has individual items, each item is shown separately
 * with per-item nutrient editing. Also provides a delete action.
 *
 * Receives `mealId` via search params, loads the meal from the nutrition store.
 */

import { Ionicons } from "@expo/vector-icons";
import RNSlider from "@react-native-community/slider";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from "react-native";
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
    FadeOut,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import type { SavedFoodItem } from "../../src/features/nutrition/estimation/estimation.types";
import { useNutritionStore } from "../../src/features/nutrition/nutrition.store";
import { formatDateHeader } from "../../src/infrastructure/i18n";
import { useAppTranslation } from "../../src/infrastructure/i18n/useAppTranslation";
import { useTheme } from "../../src/theme/useTheme";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";

export default function EditMealScreen() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const router = useRouter();
  const { mealId } = useLocalSearchParams<{ mealId: string }>();

  const meal = useNutritionStore((s) => s.meals.find((m) => m.id === mealId));
  const updateMeal = useNutritionStore((s) => s.updateMeal);
  const removeMeal = useNutritionStore((s) => s.removeMeal);

  const hasItems = (meal?.items?.length ?? 0) > 0;

  // Local editable state — initialized from the store
  const [title, setTitle] = useState(meal?.title ?? "");
  const [calories, setCalories] = useState(meal?.calories ?? 0);
  const [protein, setProtein] = useState(meal?.protein ?? 0);
  const [carbs, setCarbs] = useState(meal?.carbs ?? 0);
  const [fat, setFat] = useState(meal?.fat ?? 0);
  const [items, setItems] = useState<SavedFoodItem[]>(meal?.items ?? []);
  const [loggedAt, setLoggedAt] = useState(meal?.loggedAt ?? "");

  // Recalculate totals from items
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
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
          <View style={styles.emptyState}>
            <TText
              variant="heading"
              style={[styles.emptyTitle, { color: theme.colors.text }]}
            >
              {t("editMeal.mealNotFound")}
            </TText>
            <TSpacer size="md" />
            <Pressable
              onPress={() => router.dismiss()}
              style={[
                styles.emptyBtn,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <TText
                style={[styles.emptyBtnText, { color: theme.colors.primary }]}
              >
                {t("mealConfirm.goBack")}
              </TText>
            </Pressable>
          </View>
        </SafeAreaView>
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
    router.dismiss();
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
            router.dismiss();
          },
        },
      ]
    );
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.dismiss()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </Pressable>
          <TText
            variant="heading"
            style={[styles.headerTitle, { color: theme.colors.text }]}
          >
            {t("editMeal.editMeal")}
          </TText>
          <Pressable onPress={handleDelete} hitSlop={12}>
            <Ionicons
              name="trash-outline"
              size={22}
              color={theme.colors.error}
            />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Meal preview card */}
          <Animated.View
            entering={FadeIn.duration(400)}
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
            {!hasItems && (
              <TextInput
                value={title}
                onChangeText={setTitle}
                style={[styles.titleInput, { color: theme.colors.text }]}
                placeholderTextColor={theme.colors.textMuted}
                placeholder={t("tracking.mealNamePlaceholder")}
              />
            )}
            {hasItems && (
              <TText
                style={[styles.titleInput, { color: theme.colors.text }]}
                numberOfLines={2}
              >
                {title}
              </TText>
            )}
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
                  setLoggedAt(d.toISOString());
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
                  style={[
                    styles.sourceLabel,
                    { color: theme.colors.textMuted },
                  ]}
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
                    setLoggedAt(d.toISOString());
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
          </Animated.View>

          <TSpacer size="lg" />

          {/* Individual items (when available) */}
          {hasItems && (
            <Animated.View entering={FadeInDown.duration(400).delay(100)}>
              <TText
                style={[
                  styles.sectionLabel,
                  { color: theme.colors.textSecondary },
                ]}
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
                <TText
                  style={[styles.totalsLabel, { color: theme.colors.text }]}
                >
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
            </Animated.View>
          )}

          {/* Legacy nutrition editor (no individual items) */}
          {!hasItems && (
            <Animated.View entering={FadeInDown.duration(400).delay(100)}>
              <TText
                style={[
                  styles.sectionLabel,
                  { color: theme.colors.textSecondary },
                ]}
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
                  style={[
                    styles.divider,
                    { backgroundColor: theme.colors.border },
                  ]}
                />
                <NutrientRow
                  label={t("home.protein")}
                  value={protein}
                  unit={t("tracking.g")}
                  color="#60A5FA"
                  onChange={setProtein}
                />
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: theme.colors.border },
                  ]}
                />
                <NutrientRow
                  label={t("home.carbs")}
                  value={carbs}
                  unit={t("tracking.g")}
                  color="#FBBF24"
                  onChange={setCarbs}
                />
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: theme.colors.border },
                  ]}
                />
                <NutrientRow
                  label={t("home.fat")}
                  value={fat}
                  unit={t("tracking.g")}
                  color="#F87171"
                  onChange={setFat}
                />
              </View>
            </Animated.View>
          )}

          <TSpacer size="lg" />

          {/* Delete button (secondary) */}
          <Animated.View entering={FadeIn.duration(400).delay(200)}>
            <Pressable
              onPress={handleDelete}
              style={[
                styles.deleteBtn,
                { backgroundColor: theme.colors.error + "15" },
              ]}
            >
              <Ionicons
                name="trash-outline"
                size={18}
                color={theme.colors.error}
              />
              <TText
                style={[styles.deleteBtnText, { color: theme.colors.error }]}
              >
                {t("editMeal.deleteMeal")}
              </TText>
            </Pressable>
          </Animated.View>

          <TSpacer size="xxl" />
        </ScrollView>

        {/* Save button */}
        <Animated.View
          entering={FadeInUp.duration(400).delay(300)}
          style={styles.bottomAction}
        >
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
              <TText
                style={[styles.saveText, { color: theme.colors.textInverse }]}
              >
                {t("editMeal.saveChanges")}
              </TText>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
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
  onRemove: (index: number) => void;
}) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const [expanded, setExpanded] = useState(false);

  // Slider range: 0.25 to 5× original, stepped by 0.25
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
      {/* Item header — tap to expand */}
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={styles.itemHeader}
      >
        <TText style={styles.itemEmoji}>{item.emoji ?? "🍽️"}</TText>
        <View style={styles.itemInfo}>
          <TText
            style={[styles.itemName, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {item.name}
          </TText>
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
          <TextInput
            value={text}
            onChangeText={setText}
            onEndEditing={handleEndEditing}
            onBlur={handleEndEditing}
            keyboardType="numeric"
            autoFocus
            style={[styles.nutrientInput, { color: theme.colors.text }]}
          />
        ) : (
          <TText style={[styles.nutrientNumber, { color: theme.colors.text }]}>
            {value}
          </TText>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
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
  titleInput: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    minWidth: 200,
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
  bottomAction: {
    paddingHorizontal: 20,
    paddingBottom: 12,
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
    flex: 1,
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
  itemName: {
    fontSize: 15,
    fontWeight: "600",
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
