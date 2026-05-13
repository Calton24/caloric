import { router, type Href } from "expo-router";

export type NavTracePayload = {
  source: string;
  reason?: string;
  pathname?: string;
  segments?: unknown;
  target?: string;
  extra?: Record<string, unknown>;
};

function trace(action: string, payload: NavTracePayload) {
  if (!__DEV__) return;

  console.warn(`[NAV_TRACE:${action}]`, {
    ...payload,
    at: new Error().stack?.split("\n").slice(1, 8).join("\n"),
  });
}

export function tracedPush(target: string, payload: NavTracePayload) {
  trace("push", { ...payload, target });
  router.push(target as never);
}

export function tracedPushHref(href: Href, payload: NavTracePayload) {
  const target =
    typeof href === "string"
      ? href
      : "pathname" in href && href.pathname != null
        ? String(href.pathname)
        : JSON.stringify(href);
  trace("push", {
    ...payload,
    target,
    extra:
      typeof href === "object" && href !== null && "params" in href
        ? { params: (href as { params?: unknown }).params }
        : undefined,
  });
  router.push(href);
}

export function tracedReplace(target: string, payload: NavTracePayload) {
  trace("replace", { ...payload, target });
  router.replace(target as never);
}

export function tracedBack(payload: NavTracePayload) {
  trace("back", payload);
  router.back();
}

export function tracedDismiss(payload: NavTracePayload) {
  trace("dismiss", payload);
  router.dismiss();
}

export function tracedDismissAll(payload: NavTracePayload) {
  trace("dismissAll", payload);
  router.dismissAll();
}
