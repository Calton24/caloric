type RouterLike = {
  back: () => void;
  replace: (href: any) => void;
  canGoBack?: () => boolean;
};

export function safeRouterBack(
  router: RouterLike,
  fallback: any,
  context: string
): void {
  if (router.canGoBack?.()) {
    router.back();
    return;
  }
  if (__DEV__) {
    console.log("[NavFallback]", { context, fallback });
  }
  router.replace(fallback);
}
