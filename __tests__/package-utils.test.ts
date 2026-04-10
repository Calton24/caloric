/**
 * Unit tests for package-utils.ts
 *
 * Tests product identity resolution across offering contexts.
 * Verifies that challenge annual → calcut_annual_challenge,
 * default annual → calcut_annual.
 */

import {
    getPackageType,
    getProductId,
    resolvePackageByType,
} from "../src/features/subscription/package-utils";

// ── Mock packages ────────────────────────────────────────────

function mockPkg(identifier: string, productId: string) {
  return {
    identifier,
    product: { identifier: productId },
  };
}

// Challenge offering: weekly + challenge annual
const challengePackages = [
  mockPkg("$rc_weekly", "calcut_weekly"),
  mockPkg("$rc_annual", "calcut_annual_challenge"),
];

// Default offering: weekly + monthly + annual
const defaultPackages = [
  mockPkg("$rc_weekly", "calcut_weekly"),
  mockPkg("$rc_monthly", "calcut_monthly"),
  mockPkg("$rc_annual", "calcut_annual"),
];

// ── getPackageType() ─────────────────────────────────────────

describe("getPackageType", () => {
  it("detects weekly from calcut_weekly", () => {
    expect(getPackageType("calcut_weekly")).toBe("weekly");
  });

  it("detects monthly from calcut_monthly", () => {
    expect(getPackageType("calcut_monthly")).toBe("monthly");
  });

  it("detects annual from calcut_annual", () => {
    expect(getPackageType("calcut_annual")).toBe("annual");
  });

  it("detects annual from calcut_annual_challenge", () => {
    expect(getPackageType("calcut_annual_challenge")).toBe("annual");
  });

  it("returns unknown for empty string", () => {
    expect(getPackageType("")).toBe("unknown");
  });

  it("returns unknown for undefined", () => {
    expect(getPackageType(undefined)).toBe("unknown");
  });

  it("detects from RC identifier $rc_weekly", () => {
    expect(getPackageType("$rc_weekly")).toBe("weekly");
  });

  it("detects from RC identifier $rc_monthly", () => {
    expect(getPackageType("$rc_monthly")).toBe("monthly");
  });

  it("detects from RC identifier $rc_annual", () => {
    expect(getPackageType("$rc_annual")).toBe("annual");
  });
});

// ── getProductId() ───────────────────────────────────────────

describe("getProductId", () => {
  it("extracts from pkg.product.identifier", () => {
    expect(getProductId({ product: { identifier: "calcut_weekly" } })).toBe(
      "calcut_weekly"
    );
  });

  it("falls back to pkg.storeProduct.identifier", () => {
    expect(
      getProductId({ storeProduct: { identifier: "calcut_monthly" } })
    ).toBe("calcut_monthly");
  });

  it("returns undefined for null pkg", () => {
    expect(getProductId(null)).toBeUndefined();
  });

  it("returns undefined for empty pkg", () => {
    expect(getProductId({})).toBeUndefined();
  });
});

// ── resolvePackageByType() ───────────────────────────────────

describe("resolvePackageByType", () => {
  it("resolves weekly from challenge packages", () => {
    const pkg = resolvePackageByType(challengePackages, "weekly");
    expect(getProductId(pkg)).toBe("calcut_weekly");
  });

  it("resolves annual from challenge packages → calcut_annual_challenge", () => {
    const pkg = resolvePackageByType(challengePackages, "annual");
    expect(getProductId(pkg)).toBe("calcut_annual_challenge");
  });

  it("resolves weekly from default packages", () => {
    const pkg = resolvePackageByType(defaultPackages, "weekly");
    expect(getProductId(pkg)).toBe("calcut_weekly");
  });

  it("resolves monthly from default packages", () => {
    const pkg = resolvePackageByType(defaultPackages, "monthly");
    expect(getProductId(pkg)).toBe("calcut_monthly");
  });

  it("resolves annual from default packages → calcut_annual", () => {
    const pkg = resolvePackageByType(defaultPackages, "annual");
    expect(getProductId(pkg)).toBe("calcut_annual");
  });

  it("returns undefined when type is not in packages", () => {
    expect(resolvePackageByType(challengePackages, "monthly")).toBeUndefined();
  });

  it("returns undefined for empty array", () => {
    expect(resolvePackageByType([], "weekly")).toBeUndefined();
  });

  it("returns undefined for null-ish input", () => {
    expect(resolvePackageByType(null as any, "weekly")).toBeUndefined();
  });

  // Product identity: the critical constraint
  it("challenge annual ≠ default annual (different productIds)", () => {
    const challengeAnnual = resolvePackageByType(challengePackages, "annual");
    const defaultAnnual = resolvePackageByType(defaultPackages, "annual");
    expect(getProductId(challengeAnnual)).toBe("calcut_annual_challenge");
    expect(getProductId(defaultAnnual)).toBe("calcut_annual");
    expect(getProductId(challengeAnnual)).not.toBe(getProductId(defaultAnnual));
  });
});
