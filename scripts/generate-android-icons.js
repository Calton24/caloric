#!/usr/bin/env node
/**
 * Generate Android adaptive icon assets from the main app icon.
 *
 * Android adaptive icons use two layers:
 *   - background: solid colour (or image) that fills the full canvas
 *   - foreground: logo centred inside a "safe zone" (inner 66.67% of 108dp)
 *   - monochrome: single-colour silhouette for themed icons (Android 13+)
 *
 * Expo expects 1024×1024 PNGs for all three layers.
 */

const sharp = require("sharp");
const path = require("path");

const SIZE = 1024;
const OUT = path.resolve(__dirname, "..", "assets", "images");

async function main() {
  // ── 1. Background: solid black ──────────────────────────────────
  await sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: "#000000" },
  })
    .png()
    .toFile(path.join(OUT, "android-icon-background.png"));
  console.log("✅ android-icon-background.png  (solid black 1024×1024)");

  // ── 2. Foreground ───────────────────────────────────────────────
  // The source icon.png has the pear on a black background with rounded corners.
  // For adaptive icons we need the pear on a TRANSPARENT background, sized
  // inside the safe zone (inner ~62% of the canvas).
  //
  // Steps:
  //   a) Load raw RGBA pixels
  //   b) Make black/near-black pixels transparent (remove the background)
  //   c) Trim to the artwork bounds
  //   d) Resize to fit the safe zone and centre on the 1024 canvas

  const src = path.join(OUT, "icon.png");

  // Load raw RGBA
  const srcMeta = await sharp(src).metadata();
  const srcRaw = await sharp(src).ensureAlpha().raw().toBuffer();
  const sw = srcMeta.width;
  const sh = srcMeta.height;

  // Make black/near-black pixels transparent
  // Remove background via flood-fill from edges.
  // Any connected dark pixel reachable from the image border gets made transparent.
  // This cleanly removes the black background + anti-aliased rounded-corner edges
  // without touching dark pixels inside the pear artwork.
  // Flood-fill from edges using BOTH luminance and saturation.
  // Background = dark OR grey (low saturation). Pear = green (high saturation).
  // This cleanly separates the grey anti-aliased rounded corners from
  // the pear's dark green shadows.
  const visited = new Uint8Array(sw * sh);
  const queue = [];

  function isBackground(pi) {
    const r = srcRaw[pi], g = srcRaw[pi + 1], b = srcRaw[pi + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    // Very dark → definitely background
    if (lum < 60) return true;
    // Compute saturation (0-1): how far from grey
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    // Grey-ish (low saturation) and not too bright → background edge artifact
    if (sat < 0.15 && lum < 200) return true;
    return false;
  }

  // Seed from all border pixels
  for (let x = 0; x < sw; x++) {
    queue.push(x);                     // top row
    queue.push((sh - 1) * sw + x);     // bottom row
  }
  for (let y = 1; y < sh - 1; y++) {
    queue.push(y * sw);                // left column
    queue.push(y * sw + (sw - 1));     // right column
  }

  while (queue.length > 0) {
    const idx = queue.pop();
    if (visited[idx]) continue;
    visited[idx] = 1;

    const pi = idx * 4;
    if (!isBackground(pi)) continue; // chromatic pixel = artwork boundary, stop

    srcRaw[pi + 3] = 0; // make transparent

    // Spread to 4-connected neighbours
    const x = idx % sw, y = (idx - x) / sw;
    if (x > 0) queue.push(idx - 1);
    if (x < sw - 1) queue.push(idx + 1);
    if (y > 0) queue.push(idx - sw);
    if (y < sh - 1) queue.push(idx + sw);
  }

  const transparent = await sharp(srcRaw, { raw: { width: sw, height: sh, channels: 4 } })
    .png()
    .toBuffer();

  // Trim transparent edges
  const trimmed = await sharp(transparent)
    .trim()
    .toBuffer({ resolveWithObject: true });

  // The safe zone is ~62% of the total canvas
  const safeZone = Math.round(SIZE * 0.62);

  // Resize trimmed artwork to fit inside the safe zone
  const resized = await sharp(trimmed.data)
    .resize(safeZone, safeZone, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  // Composite onto a transparent 1024×1024 canvas (centered)
  const offset = Math.round((SIZE - safeZone) / 2);

  await sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: resized, top: offset, left: offset }])
    .png()
    .toFile(path.join(OUT, "android-icon-foreground.png"));
  console.log("✅ android-icon-foreground.png  (pear centred in safe zone)");

  // ── 3. Monochrome: white silhouette on transparent ──────────────
  // Extract the alpha channel from the resized foreground to use as a mask.
  // Then tint the entire image white, keeping only the alpha.
  const monoFg = await sharp(resized)
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });

  // Create a white-tinted version: keep alpha, set RGB to white
  const { width: mw, height: mh } = monoFg.info;
  const monoRaw = await sharp(resized).ensureAlpha().raw().toBuffer();

  // Walk pixels: set R=G=B=255, keep A as-is
  for (let i = 0; i < monoRaw.length; i += 4) {
    const a = monoRaw[i + 3];
    if (a > 0) {
      monoRaw[i] = 255;     // R
      monoRaw[i + 1] = 255; // G
      monoRaw[i + 2] = 255; // B
    }
  }

  const monoResized = await sharp(monoRaw, { raw: { width: mw, height: mh, channels: 4 } })
    .png()
    .toBuffer();

  await sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: monoResized, top: offset, left: offset }])
    .png()
    .toFile(path.join(OUT, "android-icon-monochrome.png"));
  console.log("✅ android-icon-monochrome.png  (white silhouette for themed icons)");

  console.log("\nDone! Preview the files in assets/images/ to verify.");
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
