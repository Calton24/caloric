import {
  buildRouteContext,
  isInTabsGroup,
  isNotFoundRoute,
  isTrueRootIndex,
} from "../src/features/navigation/route-segments";

describe("route-segments", () => {
  it("isInTabsGroup detects (tabs) segment", () => {
    expect(isInTabsGroup(["(tabs)", "index"])).toBe(true);
    expect(isInTabsGroup([])).toBe(false);
    expect(isInTabsGroup(["(onboarding)", "landing"])).toBe(false);
  });

  it("isNotFoundRoute detects +not-found segment", () => {
    expect(isNotFoundRoute(["+not-found"])).toBe(true);
    expect(isNotFoundRoute(["(tabs)", "index"])).toBe(false);
  });

  it("isTrueRootIndex: / without tabs segment", () => {
    expect(isTrueRootIndex("/", [])).toBe(true);
    expect(isTrueRootIndex("", [])).toBe(true);
    expect(isTrueRootIndex("/", ["(tabs)", "index"])).toBe(false);
  });

  it("isTrueRootIndex: +not-found is never root stub", () => {
    expect(isTrueRootIndex("/", ["+not-found"])).toBe(false);
  });

  it("isTrueRootIndex: bare / with only index segment", () => {
    expect(isTrueRootIndex("/", ["index"])).toBe(true);
  });

  it("isTrueRootIndex: extra segments are not root stub", () => {
    expect(isTrueRootIndex("/", ["foo"])).toBe(false);
  });

  it("buildRouteContext: ambiguous / + tabs segments", () => {
    const ctx = buildRouteContext("/", ["(tabs)", "index"]);
    expect(ctx.isInTabsGroup).toBe(true);
    expect(ctx.isTrueRootIndex).toBe(false);
    expect(ctx.isNotFoundRoute).toBe(false);
  });

  it("buildRouteContext: real root stub", () => {
    const ctx = buildRouteContext("/", []);
    expect(ctx.isInTabsGroup).toBe(false);
    expect(ctx.isTrueRootIndex).toBe(true);
    expect(ctx.isNotFoundRoute).toBe(false);
  });
});
