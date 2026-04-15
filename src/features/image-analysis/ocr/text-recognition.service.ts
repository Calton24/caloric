/**
 * Text Recognition Service
 *
 * On-device OCR using Google ML Kit Text Recognition.
 * Extracts readable text from food product images — brand names,
 * nutrition labels, flavours, weights, ingredients.
 *
 * This is the bridge between "camera sees pixels" and
 * "pipeline gets searchable text."
 */

import TextRecognition, {
    TextRecognitionScript,
} from "@react-native-ml-kit/text-recognition";

/**
 * Extract all readable text from an image.
 *
 * @param imageUri  Local file URI to the captured/selected image
 * @returns         Concatenated text from the image, or null if nothing readable
 */
export async function extractTextFromImage(
  imageUri: string
): Promise<string | null> {
  try {
    const result = await TextRecognition.recognize(
      imageUri,
      TextRecognitionScript.LATIN
    );

    if (!result?.text || result.text.trim().length === 0) {
      return null;
    }

    // ML Kit returns blocks → lines → elements.
    // Join all block texts with spaces for a clean combined string.
    const fullText = result.blocks
      .map((block) => block.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    return fullText.length > 0 ? fullText : null;
  } catch (error) {
    console.warn("OCR text recognition failed:", error);
    return null;
  }
}
