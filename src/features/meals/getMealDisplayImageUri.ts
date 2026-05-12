type MealImageLike = {
  imageUri?: string | null;
  imageUrl?: string | null;
  thumbnailUri?: string | null;
  photoUri?: string | null;
  mediaUri?: string | null;
  imagePath?: string | null;
  image_url?: string | null;
  photo_url?: string | null;
  media_url?: string | null;
};

function firstNonEmpty(values: Array<string | null | undefined>): string | null {
  for (const v of values) {
    if (typeof v === "string" && v.trim().length > 0) {
      return v;
    }
  }
  return null;
}

export function getMealDisplayImageUri(meal: MealImageLike | null | undefined): string | null {
  if (!meal) return null;
  return firstNonEmpty([
    meal.imageUri,
    meal.imageUrl,
    meal.thumbnailUri,
    meal.photoUri,
    meal.mediaUri,
    meal.image_url,
    meal.photo_url,
    meal.media_url,
  ]);
}

export function getMealDisplayImagePath(
  meal: MealImageLike | null | undefined
): string | null {
  if (!meal) return null;
  return firstNonEmpty([meal.imagePath]);
}

