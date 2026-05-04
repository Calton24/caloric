/**
 * Centralized food-name display formatting (presentation-only).
 *
 * Normalizes API noise: ALL CAPS, inconsistent casing, ellipsis dots.
 * Does not modify persisted meal data — format at render boundaries.
 */

const SMALL_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "but",
  "by",
  "for",
  "from",
  "in",
  "nor",
  "of",
  "off",
  "on",
  "or",
  "per",
  "the",
  "to",
  "versus",
  "vs",
  "via",
  "with",
]);

/** Canonical uppercase spellings for short tokens commonly lowercased in APIs. */
const PRESERVE_UPPER = new Map<string, string>([
  ["bbq", "BBQ"],
  ["uk", "UK"],
  ["us", "US"],
  ["xl", "XL"],
  ["xxl", "XXL"],
  ["xs", "XS"],
]);

function formatSimpleCore(
  part: string,
  atSentenceStart: boolean,
  allowSmallWordLowercase: boolean
): string {
  if (!part) return part;
  if (/^\d/.test(part)) return part;

  const lower = part.toLowerCase();
  const preserved = PRESERVE_UPPER.get(lower);
  if (preserved) return preserved;

  if (allowSmallWordLowercase && !atSentenceStart && SMALL_WORDS.has(lower)) {
    return lower;
  }

  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function formatHyphenatedCore(core: string, isFirstWord: boolean): string {
  const segments = core.split("-");
  return segments
    .map((seg, i) => {
      const atSentenceStart = isFirstWord && i === 0;
      const allowSmall = !atSentenceStart;
      return formatSimpleCore(seg, atSentenceStart, allowSmall);
    })
    .join("-");
}

/**
 * Word token may include leading/trailing punctuation, e.g. "(Chicken," or "bar)".
 */
function formatWordToken(word: string, isFirstWord: boolean): string {
  // Hyphen must be last in the class below (don't form accidental ranges).
  const m = word.match(
    /^([^A-Za-z0-9']*)([A-Za-z0-9']+(?:-[A-Za-z0-9']+)*)(.*)$/
  );
  if (!m) return word;
  const [, lead, core, trail] = m;
  if (!core) return word;
  return `${lead}${formatHyphenatedCore(core, isFirstWord)}${trail}`;
}

function hasAlphaNum(s: string): boolean {
  return /[A-Za-z0-9]/.test(s);
}

/**
 * Format a food name for UI (title-style casing, cleanup).
 */
export function formatFoodName(input: string): string {
  if (input == null) return input;
  const str = String(input);
  if (str.trim() === "") return str;

  let s = str.replace(/\.\.\./g, "…");
  s = s.replace(/\s+/g, " ").trim();
  if (!s.endsWith("…")) {
    s = s.replace(/\.+$/g, "").trim();
  }

  const chunks = s.split(/(\s+)/);
  let firstWordDone = false;

  return chunks
    .map((chunk) => {
      if (/^\s+$/.test(chunk)) return chunk;
      if (!hasAlphaNum(chunk)) return chunk;
      const out = formatWordToken(chunk, !firstWordDone);
      firstWordDone = true;
      return out;
    })
    .join("");
}
