import {
  getMealDisplayImagePath,
  getMealDisplayImageUri,
} from "./getMealDisplayImageUri";

describe("getMealDisplayImageUri", () => {
  it("prefers imageUri first", () => {
    expect(
      getMealDisplayImageUri({
        imageUri: "file://local.jpg",
        imageUrl: "https://cdn/image.jpg",
      })
    ).toBe("file://local.jpg");
  });

  it("falls back through legacy aliases", () => {
    expect(
      getMealDisplayImageUri({
        imageUri: "",
        imageUrl: "",
        thumbnailUri: "",
        photoUri: "file://photo.jpg",
      })
    ).toBe("file://photo.jpg");
  });

  it("supports older remote fields", () => {
    expect(
      getMealDisplayImageUri({
        image_url: "https://cdn/legacy.jpg",
      })
    ).toBe("https://cdn/legacy.jpg");
  });

  it("returns null when no image is present", () => {
    expect(getMealDisplayImageUri({})).toBeNull();
  });
});

describe("getMealDisplayImagePath", () => {
  it("returns imagePath when present", () => {
    expect(
      getMealDisplayImagePath({
        imagePath: "user/meal-1.jpg",
      })
    ).toBe("user/meal-1.jpg");
  });

  it("returns null when imagePath is missing", () => {
    expect(getMealDisplayImagePath({})).toBeNull();
  });
});

