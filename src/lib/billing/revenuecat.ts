/**
 * RevenueCat Billing Provider
 *
 * Full implementation using:
 *   - react-native-purchases  (SDK core: configure, getCustomerInfo, logIn, logOut, restorePurchases)
 *   - react-native-purchases-ui (Paywall UI + Customer Center)
 *
 * Both modules are lazy-loaded so the provider file can be imported on all
 * platforms without causing a hard crash on web / storybook.
 */

import { Platform } from "react-native";
import type { RevenueCatConfig } from "../../config/types";
import { logger } from "../../logging/logger";
import type { BillingProvider, Entitlement, SubscriptionTier } from "./types";

/** Extract readable details from RevenueCat native errors (which serialize as `{}`). */
function rcError(error: unknown): Record<string, unknown> {
  if (error == null) return { raw: String(error) };
  const e = error as any;
  return {
    message: e.message ?? e.readableErrorCode ?? String(error),
    code: e.code,
    readableErrorCode: e.readableErrorCode,
    underlyingErrorMessage: e.underlyingErrorMessage,
    userInfo: e.userInfo,
  };
}

// ─── Lazy module references ─────────────────────────────────────────────────

let _Purchases: any = null;
let _RevenueCatUI: any = null;

function getPurchases() {
  if (!_Purchases) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      _Purchases = require("react-native-purchases").default;
    } catch {
      throw new Error(
        "[RevenueCat] react-native-purchases not installed. Run: npx expo install react-native-purchases"
      );
    }
  }
  return _Purchases;
}

function getRevenueCatUI() {
  if (!_RevenueCatUI) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      _RevenueCatUI = require("react-native-purchases-ui").default;
    } catch {
      throw new Error(
        "[RevenueCat] react-native-purchases-ui not installed. Run: npx expo install react-native-purchases-ui"
      );
    }
  }
  return _RevenueCatUI;
}

// ─── Provider ────────────────────────────────────────────────────────────────

export class RevenueCatProvider implements BillingProvider {
  private config: RevenueCatConfig;
  private initPromise: Promise<void> | null = null;
  private entitlementCallbacks: ((entitlement: Entitlement) => void)[] = [];

  constructor(config: RevenueCatConfig) {
    this.config = config;
  }

  /**
   * Wait for initialization to complete. All public methods call this
   * so callers never hit the native SDK before configure() finishes.
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
      return;
    }
    throw new Error("[RevenueCat] initialize() has not been called yet");
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    // Idempotent — return the same promise if already initializing/initialized
    if (this.initPromise) {
      return this.initPromise;
    }
    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  private async _doInitialize(): Promise<void> {
    // ── Guard: reject test keys in production builds ──
    if (!__DEV__ && this.config.apiKey.startsWith("test_")) {
      logger.error(
        "[RevenueCat] FATAL: Test API key detected in production build. " +
          "Set EXPO_PUBLIC_REVENUECAT_API_KEY to your production key."
      );
      throw new Error(
        "[RevenueCat] Cannot use test API key in production build"
      );
    }

    try {
      const RC = getPurchases();

      // Enable verbose logging in dev for easier debugging.
      // IMPORTANT: setLogHandler MUST be called before setLogLevel.
      // We route all SDK logs through console.warn (never console.error) to
      // prevent Expo Metro's HMR client from calling Reflect.construct on a
      // NamelessError subclass — which crashes under Hermes when the native
      // RevenueCat SDK emits config/offerings errors via RCTDeviceEventEmitter.
      if (__DEV__) {
        if (RC.setLogHandler) {
          RC.setLogHandler((_logLevel: any, message: string) => {
            console.warn("[RevenueCat-SDK]", message);
          });
        }
        RC.setLogLevel(RC.LOG_LEVEL?.WARN ?? 2);
      }

      // Always call configure() — the SDK handles duplicate calls gracefully.
      // The previous isConfigured() guard caused "no singleton" errors on hot
      // reload because the native singleton was dead but the flag was stale.
      if (Platform.OS === "ios" || Platform.OS === "android") {
        RC.configure({ apiKey: this.config.apiKey });
      } else {
        logger.warn("[RevenueCat] Unsupported platform:", Platform.OS);
        return;
      }

      // Real-time subscription status updates (renewals, expirations, purchases)
      RC.addCustomerInfoUpdateListener((customerInfo: any) => {
        const entitlement = this.mapCustomerInfo(customerInfo);
        this.entitlementCallbacks.forEach((cb) => cb(entitlement));
      });

      logger.log("[RevenueCat] Initialized successfully");

      // Diagnostic: log key + identity + entitlement state on init
      if (__DEV__) {
        const keyPrefix = this.config.apiKey.slice(0, 10);
        logger.log(`[RevenueCat:diag] apiKey: ${keyPrefix}...`);
        try {
          const appUserID = await RC.getAppUserID();
          const info = await RC.getCustomerInfo();
          logger.log("[RevenueCat:diag] appUserID:", appUserID);
          logger.log(
            "[RevenueCat:diag] activeEntitlements:",
            Object.keys(info?.entitlements?.active ?? {})
          );
          logger.log(
            "[RevenueCat:diag] activeSubscriptions:",
            info?.activeSubscriptions
          );
        } catch {
          /* non-fatal */
        }
      }
    } catch (error) {
      // Reset so a retry can attempt init again
      this.initPromise = null;
      logger.error("[RevenueCat] Initialization failed:", error);
      throw error;
    }
  }

  // ── User identification ─────────────────────────────────────────────────

  /**
   * Identify a logged-in user so purchases are tied to their account.
   * Call this after the user authenticates (use your backend user ID).
   */
  async logIn(userId: string): Promise<void> {
    try {
      await this.ensureInitialized();
    } catch {
      logger.warn("[RevenueCat] logIn called before initialize, skipping");
      return;
    }
    try {
      const RC = getPurchases();
      const { customerInfo } = await RC.logIn(userId);
      logger.log("[RevenueCat] Logged in:", userId);
      // Emit updated entitlement right away
      const entitlement = this.mapCustomerInfo(customerInfo);
      this.entitlementCallbacks.forEach((cb) => cb(entitlement));
    } catch (error) {
      // Non-fatal — the user can still use the app anonymously
      logger.error("[RevenueCat] logIn failed:", rcError(error));
    }
  }

  /**
   * Log out the current user.  Call this when the user signs out so the
   * SDK reverts to an anonymous session.
   */
  async logOut(): Promise<void> {
    try {
      await this.ensureInitialized();
    } catch {
      return;
    }
    try {
      const RC = getPurchases();
      const isAnonymous = await RC.isAnonymous();
      if (isAnonymous) {
        logger.log("[RevenueCat] Already anonymous, skipping logOut");
        return;
      }
      const customerInfo = await RC.logOut();
      const entitlement = this.mapCustomerInfo(customerInfo);
      this.entitlementCallbacks.forEach((cb) => cb(entitlement));
      logger.log("[RevenueCat] Logged out");
    } catch (error) {
      logger.error("[RevenueCat] logOut failed:", rcError(error));
    }
  }

  // ── Entitlements ────────────────────────────────────────────────────────

  async getEntitlements(): Promise<Entitlement> {
    await this.ensureInitialized();
    try {
      const RC = getPurchases();
      const customerInfo = await RC.getCustomerInfo();
      return this.mapCustomerInfo(customerInfo);
    } catch (error) {
      logger.error("[RevenueCat] Failed to get entitlements:", rcError(error));
      throw error;
    }
  }

  onEntitlementsChanged(callback: (entitlement: Entitlement) => void): void {
    this.entitlementCallbacks.push(callback);
  }

  // ── Offerings ───────────────────────────────────────────────────────────

  /**
   * Fetch the configured offerings from RevenueCat.
   * Returns null if no offerings are configured yet.
   */
  async getOfferings(): Promise<any> {
    await this.ensureInitialized();
    try {
      const RC = getPurchases();
      const offerings = await RC.getOfferings();
      return offerings;
    } catch (error) {
      // Use warn (not error) to avoid crashing Expo Metro's HMR client under
      // Hermes — its NamelessError stack-capture uses Reflect.construct which
      // throws when console.error is called with a native error object.
      // Pass only the string message to avoid redactSensitive crashing on
      // Proxy-based native NSError objects.
      const msg =
        error instanceof Error ? error.message : String(error ?? "unknown");
      logger.warn(`[RevenueCat] Failed to get offerings (non-fatal): ${msg}`);
      return null;
    }
  }

  // ── Paywall UI ──────────────────────────────────────────────────────────

  /**
   * Presents the RevenueCat-managed paywall UI.
   * The paywall is configured entirely in the RevenueCat dashboard —
   * no code changes required when updating copy, pricing, or layout.
   */
  async presentPaywall(_trigger?: string): Promise<boolean> {
    try {
      const RCUI = getRevenueCatUI();
      const { PAYWALL_RESULT } = require("react-native-purchases-ui"); // eslint-disable-line @typescript-eslint/no-require-imports
      const paywallResult = await RCUI.presentPaywall({});
      logger.log("[RevenueCat] Paywall closed with result:", paywallResult);

      switch (paywallResult) {
        case PAYWALL_RESULT.PURCHASED:
        case PAYWALL_RESULT.RESTORED:
          return true;
        case PAYWALL_RESULT.NOT_PRESENTED:
        case PAYWALL_RESULT.ERROR:
        case PAYWALL_RESULT.CANCELLED:
        default:
          return false;
      }
    } catch (error) {
      logger.error("[RevenueCat] presentPaywall failed:", error);
      throw error;
    }
  }

  /**
   * Presents the paywall only if the user does not already have the
   * specified entitlement (defaults to "pro").  Useful as a gate
   * before premium features.
   */
  async presentPaywallIfNeeded(
    requiredEntitlementId = "premium"
  ): Promise<void> {
    try {
      const RCUI = getRevenueCatUI();
      const result = await RCUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: requiredEntitlementId,
      });
      logger.log("[RevenueCat] PaywallIfNeeded result:", result);
    } catch (error) {
      logger.error("[RevenueCat] presentPaywallIfNeeded failed:", error);
      throw error;
    }
  }

  // ── Customer Center ─────────────────────────────────────────────────────

  /**
   * Opens the RevenueCat Customer Center — a native UI that lets users
   * manage their subscriptions, request refunds, and contact support.
   * No custom UI code required.
   */
  async presentCustomerCenter(): Promise<void> {
    try {
      const RCUI = getRevenueCatUI();
      await RCUI.presentCustomerCenter();
      logger.log("[RevenueCat] Customer Center closed");
    } catch (error) {
      logger.error("[RevenueCat] presentCustomerCenter failed:", error);
      throw error;
    }
  }

  // ── Restore ─────────────────────────────────────────────────────────────

  async restorePurchases(): Promise<void> {
    await this.ensureInitialized();
    try {
      const RC = getPurchases();
      logger.log("[RevenueCat] Restoring purchases…");
      const customerInfo = await RC.restorePurchases();
      const entitlement = this.mapCustomerInfo(customerInfo);
      this.entitlementCallbacks.forEach((cb) => cb(entitlement));
      logger.log("[RevenueCat] Purchases restored");
    } catch (error) {
      logger.error("[RevenueCat] Failed to restore purchases:", error);
      throw error;
    }
  }

  // ── Utilities ───────────────────────────────────────────────────────────

  /**
   * Purchase a specific package from an Offering.
   * Returns the updated CustomerInfo after purchase.
   */
  async purchasePackage(pkg: any): Promise<any> {
    await this.ensureInitialized();
    try {
      const RC = getPurchases();
      const { customerInfo } = await RC.purchasePackage(pkg);
      const entitlement = this.mapCustomerInfo(customerInfo);
      this.entitlementCallbacks.forEach((cb) => cb(entitlement));
      logger.log("[RevenueCat] Package purchased:", pkg.identifier);

      // Diagnostic: log entitlement state after purchase
      if (__DEV__) {
        const appUserID = await RC.getAppUserID();
        logger.log("[RevenueCat:diag] post-purchase appUserID:", appUserID);
        logger.log(
          "[RevenueCat:diag] post-purchase activeEntitlements:",
          Object.keys(customerInfo?.entitlements?.active ?? {})
        );
        logger.log("[RevenueCat:diag] post-purchase isPro:", entitlement.isPro);
      }
      return customerInfo;
    } catch (error: any) {
      if (error.userCancelled) {
        logger.log("[RevenueCat] Purchase cancelled by user");
        return null;
      }
      logger.error("[RevenueCat] Purchase failed:", error);
      throw error;
    }
  }

  getProviderName(): string {
    return "revenueCat";
  }

  /**
   * Map RevenueCat CustomerInfo → our unified Entitlement model.
   *
   * Looks for an active entitlement named "premium" in the RevenueCat dashboard.
   */
  private mapCustomerInfo(customerInfo: any): Entitlement {
    const proEntitlement = customerInfo?.entitlements?.active?.["premium"];

    if (__DEV__) {
      const allActive = Object.keys(customerInfo?.entitlements?.active ?? {});
      logger.log(
        `[RevenueCat:diag] mapCustomerInfo — active keys: ${JSON.stringify(allActive)} | matched: ${!!proEntitlement}`
      );
    }

    if (proEntitlement) {
      return {
        isPro: true,
        tier: this.mapProductToTier(proEntitlement.productIdentifier),
        expiresAt: proEntitlement.expirationDate
          ? new Date(proEntitlement.expirationDate)
          : null,
        isActive: true,
        productId: proEntitlement.productIdentifier,
      };
    }

    return {
      isPro: false,
      tier: "free",
      expiresAt: null,
      isActive: false,
    };
  }

  private mapProductToTier(productId: string | undefined): SubscriptionTier {
    if (!productId) return "pro";
    const lower = productId.toLowerCase();
    if (lower.includes("enterprise")) return "enterprise";
    if (lower.includes("team")) return "team";
    return "pro";
  }
}
