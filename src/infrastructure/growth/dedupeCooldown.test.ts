import {
    COOLDOWN_MS,
    DEDUPE_WINDOW_MS,
    getCooldownRemainingMs,
    getDedupeHash,
    hashString,
    isWithinWindow,
    normaliseTitle,
} from "./utils";

describe("growth utils", () => {
  it("normalises titles consistently", () => {
    expect(normaliseTitle("  Hello   World ")).toBe("hello world");
  });

  it("hashString is deterministic", () => {
    expect(hashString("abc")).toBe(hashString("abc"));
    expect(hashString("abc")).not.toBe(hashString("abcd"));
  });

  it("getDedupeHash is stable across formatting", () => {
    const hashA = getDedupeHash("Hello  World", "anon");
    const hashB = getDedupeHash(" hello world ", "anon");
    expect(hashA).toBe(hashB);
  });

  it("computes cooldown remaining", () => {
    const now = 2_000;
    const remaining = getCooldownRemainingMs(now - 500, now, 1_000);
    expect(remaining).toBe(500);
    expect(getCooldownRemainingMs(now - 2_000, now, 1_000)).toBe(0);
  });

  it("checks dedupe window", () => {
    const now = DEDUPE_WINDOW_MS + 1_000;
    expect(isWithinWindow(now - DEDUPE_WINDOW_MS + 1, now)).toBe(true);
    expect(isWithinWindow(now - DEDUPE_WINDOW_MS - 1, now)).toBe(false);
  });

  it("uses default cooldown window", () => {
    const now = 1_000;
    expect(getCooldownRemainingMs(now - 10, now)).toBe(COOLDOWN_MS - 10);
  });
});
