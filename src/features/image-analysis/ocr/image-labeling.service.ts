/**
 * Image Labeling Service
 *
 * On-device visual food recognition using Google ML Kit Image Labeling.
 * Identifies what's in a food photo (e.g. "ice cream", "chocolate", "pizza")
 * when there's no readable text for OCR to extract.
 *
 * Returns food-relevant labels that can be fed into the text-based
 * nutrition pipeline as a fallback description.
 *
 * Uses label-food-mapper to translate generic ML Kit labels
 * (e.g. "baked goods") into specific food names the pipeline can look up.
 */

import ImageLabeling from "@react-native-ml-kit/image-labeling";

import { mapLabelsToFood } from "./label-food-mapper";

/** Labels too generic to be useful for food identification. */
const IGNORED_LABELS = new Set([
  "ingredient",
  "cuisine",
  "recipe",
  "tableware",
  "plate",
  "bowl",
  "table",
  "indoor",
  "plant",
  "animal",
  "wood",
  "room",
  "hand",
  "person",
  "human",
  "finger",
  "sky",
  "grass",
  "tree",
  "floor",
  "wall",
  "furniture",
  "clothing",
  "text",
  "font",
  "close-up",
  "macro photography",
  "still life photography",
  "stock photography",
  "rectangle",
  "circle",
]);

/** Minimum confidence to consider a label relevant. */
const MIN_CONFIDENCE = 0.3;

/** Max labels to include in the description. */
const MAX_LABELS = 8;

/**
 * Identify food in an image using on-device ML Kit Image Labeling.
 *
 * Uses a two-stage approach:
 *   1. ML Kit extracts raw visual labels from the image
 *   2. label-food-mapper translates labels into specific food names
 *
 * @param imageUri  Local file URI to the captured/selected image
 * @returns         Mapped food description, or null if nothing food-like detected
 */
export async function labelFoodImage(imageUri: string): Promise<string | null> {
  try {
    const result = await ImageLabeling.label(imageUri);

    if (!result || result.length === 0) {
      return null;
    }

    // Filter by confidence threshold and remove overly generic labels
    const foodLabels = result
      .filter(
        (label) =>
          label.confidence >= MIN_CONFIDENCE &&
          !IGNORED_LABELS.has(label.text.toLowerCase())
      )
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, MAX_LABELS)
      .map((label) => label.text.toLowerCase());

    if (foodLabels.length === 0) {
      return null;
    }

    // Use the label-to-food mapper for smarter translation
    const mappedFood = mapLabelsToFood(foodLabels);
    if (mappedFood) {
      return mappedFood;
    }

    // Fallback: join raw labels if mapper couldn't translate
    return foodLabels.join(" ");
  } catch (error) {
    console.warn("Image labeling failed:", error);
    return null;
  }
}

/**
 * Get raw ML Kit labels with confidence scores.
 *
 * Unlike `labelFoodImage()` which returns a single string description,
 * this returns structured label data needed by the taxonomy classifier
 * and candidate generator.
 *
 * @param imageUri  Local file URI to the captured/selected image
 * @returns         Array of { label, confidence } sorted by confidence desc
 */
export async function getRawFoodLabels(
  imageUri: string
): Promise<{ label: string; confidence: number }[]> {
  try {
    const result = await ImageLabeling.label(imageUri);

    if (!result || result.length === 0) {
      return [];
    }

    return result
      .filter(
        (label) =>
          label.confidence >= MIN_CONFIDENCE &&
          !IGNORED_LABELS.has(label.text.toLowerCase())
      )
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, MAX_LABELS)
      .map((label) => ({
        label: label.text.toLowerCase(),
        confidence: label.confidence,
      }));
  } catch (error) {
    console.warn("Image labeling (raw) failed:", error);
    return [];
  }
}
