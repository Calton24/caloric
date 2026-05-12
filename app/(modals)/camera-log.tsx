/**
 * Camera Logging Screen
 *
 * Live viewfinder via react-native-vision-camera for food scanning.
 * Captures a photo and immediately runs it through the AI nutrition
 * pipeline (triage → extract → route → match → estimate), then
 * auto-navigates to the confirm screen with results.
 *
 * Flow: Camera → Snap → Instant Analysis → Result
 * No forms, no typing, no manual triggers.
 */

import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { usePathname, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Alert,
    type GestureResponderEvent,
    type LayoutChangeEvent,
    Linking,
    Platform,
    Pressable,
    StyleSheet,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    Camera,
    useCameraDevice,
    useCameraPermission,
    useCodeScanner,
} from "react-native-vision-camera";
import { useAccountGate } from "../../src/features/auth/useAccountGate";
import { useAuth } from "../../src/features/auth/useAuth";
import { useBackgroundScanStore } from "../../src/features/camera/background-scan.store";
import { computeFocusPoint } from "../../src/features/camera/camera-log.helpers";
import { runBackgroundScan } from "../../src/features/food-logging/background-scan.service";
import type { FoodIdentificationErrorReason } from "../../src/features/food-logging/components/FoodIdentificationFallback";
import { FoodIdentificationFallback } from "../../src/features/food-logging/components/FoodIdentificationFallback";
import { copyImageToDurableLocation } from "../../src/features/food-logging/meal-image-upload.service";
import { isRenderableConfirmMealPayload } from "../../src/features/nutrition/meal-normalize";
import { useNutritionDraftStore } from "../../src/features/nutrition/nutrition.draft.store";
import { useLoggingFlow } from "../../src/features/nutrition/use-logging-flow";
import { useFeatureAccess } from "../../src/features/subscription/useFeatureAccess";
import { reportError } from "../../src/infrastructure/errorReporting";
import { addFoodLoggingBreadcrumb } from "../../src/infrastructure/errorReporting/foodLoggingErrors";
import { useAppTranslation } from "../../src/infrastructure/i18n/useAppTranslation";
import { useTheme } from "../../src/theme/useTheme";
import { AuthGateModal } from "../../src/ui/components/AuthGateModal";
import { FeatureGatePaywall } from "../../src/ui/components/FeatureGatePaywall";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";
import { dismissRootSheet } from "../../src/ui/sheets/BottomSheetProvider";
import { FoodLoggingErrorBoundary } from "../../src/ui/errors/FoodLoggingErrorBoundary";

const BARCODE_LOOKUP_TIMEOUT_MS = 10_000;

type CameraState = "viewfinder" | "error" | "dismissing" | "looking_up_barcode";

function logBarcodeScanFlow(payload: {
  phase:
    | "detected"
    | "lock_acquired"
    | "lookup_started"
    | "lookup_success"
    | "lookup_not_found"
    | "lookup_error"
    | "lookup_invalid_payload"
    | "lookup_timeout"
    | "navigate_confirm"
    | "show_fallback"
    | "unlock"
    | "stale_ignore";
  barcode: string;
  elapsedMs?: number;
  state?: string;
  hasProduct?: boolean;
  hasRenderablePayload?: boolean;
  gen?: number;
}) {
  if (!__DEV__) return;
  console.log("[BarcodeScanFlow]", JSON.stringify(payload));
}

function CameraLoggingScreenInner() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { startFromInput, startFromBarcode } = useLoggingFlow();
  const { requireAccount, gateVisible, gateReason, dismissGate } =
    useAccountGate();
  const { canScan, scansRemaining, isPro, requiresRevalidation } =
    useFeatureAccess();
  const [showScanGate, setShowScanGate] = useState(false);

  const cameraRef = useRef<Camera>(null);
  const device = useCameraDevice("back");
  const { hasPermission, requestPermission } = useCameraPermission();
  // Single-shot lock so a fast double-tap on the shutter only enqueues one job.
  const captureLockRef = useRef(false);

  useEffect(() => {
    addFoodLoggingBreadcrumb("food_logging.camera_opened", {
      route: pathname,
    });
  }, [pathname]);

  useEffect(() => {
    addFoodLoggingBreadcrumb("food_logging.camera_permission_status", {
      granted: hasPermission,
      source: "hook",
    });
  }, [hasPermission]);

  const [state, setState] = useState<CameraState>("viewfinder");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [torch, setTorch] = useState<"off" | "on">("off");
  const [description, setDescription] = useState("");
  // Preserved across the error → fallback transition so the fallback can
  // (a) show the actual scanned code, (b) re-attempt the same lookup on
  // "Retry", and (c) keep "Scan again" semantically distinct from "Retry".
  const [failedBarcode, setFailedBarcode] = useState<string | null>(null);
  const [barcodeErrorReason, setBarcodeErrorReason] =
    useState<FoodIdentificationErrorReason>("barcode_not_found");
  const barcodeLockRef = useRef(false);
  const barcodeLookupGenRef = useRef(0);
  const [cameraLayout, setCameraLayout] = useState({ width: 0, height: 0 });
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(
    null
  );

  // ── Barcode scanner ──────────────────────────────────────────────────

  const handleBarcodeScanned = useCallback(
    async (barcode: string, symbology?: string) => {
      if (barcodeLockRef.current || state !== "viewfinder") {
        if (__DEV__ && barcodeLockRef.current) {
          logBarcodeScanFlow({
            phase: "stale_ignore",
            barcode,
            state,
          });
        }
        return;
      }

      barcodeLockRef.current = true;
      const myGen = ++barcodeLookupGenRef.current;
      const t0 = Date.now();

      logBarcodeScanFlow({ phase: "detected", barcode, gen: myGen });
      addFoodLoggingBreadcrumb("food_logging.barcode_detected", {
        symbology: symbology ?? "unknown",
        code_length: barcode.length,
      });

      setTorch("off");
      setBarcodeErrorReason("barcode_not_found");
      setState("looking_up_barcode");
      logBarcodeScanFlow({
        phase: "lock_acquired",
        barcode,
        gen: myGen,
      });

      try {
        logBarcodeScanFlow({ phase: "lookup_started", barcode, gen: myGen });

        const raceOutcome = await Promise.race<
          { kind: "resolved"; ok: boolean } | { kind: "timeout" }
        >([
          startFromBarcode(barcode).then((ok) => ({
            kind: "resolved" as const,
            ok,
          })),
          new Promise<{ kind: "timeout" }>((resolve) =>
            setTimeout(
              () => resolve({ kind: "timeout" }),
              BARCODE_LOOKUP_TIMEOUT_MS
            )
          ),
        ]);

        const elapsedMs = Date.now() - t0;

        if (barcodeLookupGenRef.current !== myGen) {
          logBarcodeScanFlow({
            phase: "stale_ignore",
            barcode,
            elapsedMs,
            gen: myGen,
          });
          return;
        }

        if (raceOutcome.kind === "timeout") {
          logBarcodeScanFlow({
            phase: "lookup_timeout",
            barcode,
            elapsedMs,
            hasProduct: false,
          });
          addFoodLoggingBreadcrumb("food_logging.barcode_lookup_failed", {
            reason: "timeout",
          });
          setFailedBarcode(barcode);
          setBarcodeErrorReason("network_error");
          setState("error");
          logBarcodeScanFlow({
            phase: "show_fallback",
            barcode,
            elapsedMs,
          });
          return;
        }

        const ok = raceOutcome.ok;
        const draft = useNutritionDraftStore.getState().draft;
        const hasRenderable = isRenderableConfirmMealPayload(draft);
        const hasProduct = Boolean(ok && draft?.source === "barcode");

        logBarcodeScanFlow({
          phase: ok ? "lookup_success" : "lookup_not_found",
          barcode,
          elapsedMs,
          hasProduct,
          hasRenderablePayload: hasRenderable,
        });

        if (ok && hasRenderable) {
          logBarcodeScanFlow({
            phase: "navigate_confirm",
            barcode,
            elapsedMs,
            hasRenderablePayload: true,
          });
          setState("dismissing");
          router.replace("/(modals)/confirm-meal" as never);
          return;
        }

        if (ok && !hasRenderable) {
          logBarcodeScanFlow({
            phase: "lookup_invalid_payload",
            barcode,
            elapsedMs,
            hasRenderablePayload: false,
          });
          setFailedBarcode(barcode);
          setBarcodeErrorReason("barcode_not_found");
          setState("error");
          logBarcodeScanFlow({
            phase: "show_fallback",
            barcode,
            elapsedMs,
          });
          return;
        }

        setFailedBarcode(barcode);
        setBarcodeErrorReason("barcode_not_found");
        setState("error");
        logBarcodeScanFlow({
          phase: "show_fallback",
          barcode,
          elapsedMs,
        });
      } catch (err) {
        const elapsedMs = Date.now() - t0;
        reportError(err, {
          area: "scan",
          action: "handleBarcodeScanned",
          screen: "camera-log",
          extra: { barcodeLength: barcode?.length },
        });
        if (barcodeLookupGenRef.current === myGen) {
          setFailedBarcode(barcode);
          setBarcodeErrorReason("unknown");
          setState("error");
          logBarcodeScanFlow({
            phase: "lookup_error",
            barcode,
            elapsedMs,
          });
        }
      } finally {
        if (barcodeLookupGenRef.current === myGen) {
          barcodeLockRef.current = false;
          logBarcodeScanFlow({
            phase: "unlock",
            barcode,
            elapsedMs: Date.now() - t0,
            gen: myGen,
          });
        }
      }
    },
    [startFromBarcode, router, state]
  );

  const codeScanner = useCodeScanner({
    codeTypes: [
      "ean-13",
      "ean-8",
      "upc-a",
      "upc-e",
      "code-128",
      "code-39",
      "qr",
    ],
    onCodeScanned: (codes) => {
      const raw = codes[0];
      if (!raw?.value) return;
      handleBarcodeScanned(raw.value, raw.type);
    },
  });

  // Reset barcode lock when returning to viewfinder
  useEffect(() => {
    if (state === "viewfinder") {
      barcodeLockRef.current = false;
    }
  }, [state]);

  // ── Permission handling ──────────────────────────────────────────────

  const handleRequestPermission = useCallback(async () => {
    addFoodLoggingBreadcrumb("food_logging.camera_permission_status", {
      source: "user_prompt",
      action: "request_started",
    });
    const granted = await requestPermission();
    addFoodLoggingBreadcrumb("food_logging.camera_permission_status", {
      source: "user_prompt",
      granted,
      action: "request_completed",
    });
    if (!granted) {
      Alert.alert(
        t("camera.cameraAccessRequired"),
        t("camera.cameraAccessRequiredDesc"),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("camera.openSettings"),
            onPress: () => Linking.openSettings(),
          },
        ]
      );
    }
  }, [requestPermission, t]);

  // ── Capture → dismiss → background analysis ─────────────────────────────
  //
  // Hand-off contract (production-grade):
  //   The shutter is sacred. The ONLY awaited operation between user tap and
  //   modal dismiss is `cameraRef.current.takePhoto()`. Everything else —
  //   entitlement recheck, credit decrement, the AI pipeline — runs AFTER
  //   the camera modal is dismissed, owned by the Home AnalyzingCard.
  //
  // What used to make the modal feel like a 10-second hang:
  //   1. Default `takePhoto({})` is high-quality + metadata, 1–2 s on iOS.
  //   2. Conditional `{state === "viewfinder" && <Camera />}` UNMOUNTED the
  //      Camera component on the dismiss state change. VisionCamera blocks
  //      the JS thread while it tears down an *active* AVCaptureSession.
  //   3. `router.back()` from a nested modal stack pops within `(modals)/`,
  //      sometimes leaving an empty modal frame. `router.dismissAll()` exits
  //      the entire modal presentation in one step.
  //
  // Each is fixed in `handleCapture` below.

  const enqueueScan = useCallback(
    (uri: string, desc?: string) => {
      // ── 1. Synchronous fail-fast gate (no network) ──────────────────────
      if (!requireAccount("scan")) return;
      const initialAccess = canScan();

      const canFlipViaRecheck =
        (!initialAccess.allowed && initialAccess.reason === "no_credits") ||
        (initialAccess.allowed && requiresRevalidation);

      if (!initialAccess.allowed && !canFlipViaRecheck) {
        setShowScanGate(true);
        return;
      }

      // ── 2. Optimistic commit ─────────────────────────────────────────────
      const jobId = useBackgroundScanStore.getState().startScan({
        imageUri: uri,
        userId: user?.id ?? "anon",
      });
      setImageUri(uri);
      addFoodLoggingBreadcrumb("food_logging.background_scan_created", {
        job_id: jobId,
        source: "ai_camera",
      });

      // ── 3. Dismiss the camera modal IMMEDIATELY ─────────────────────────
      // Kill the Home FAB sheet (root provider tree) synchronously so it
      // isn't visible behind the modal as it slides off.
      dismissRootSheet({ immediate: true });

      // Tear down the camera session before unmount. We KEEP the <Camera />
      // mounted in the JSX (just isActive=false via state) so VisionCamera
      // can release the AVCaptureSession asynchronously without blocking
      // the JS thread.
      addFoodLoggingBreadcrumb("food_logging.camera_dismiss_requested", {
        job_id: jobId,
      });
      setState("dismissing");

      // Pop the entire (modals) presentation, not just one screen. This is
      // what eliminates the dark "ghost modal" frame.
      requestAnimationFrame(() => {
        if (router.canDismiss()) {
          router.dismissAll();
        } else {
          router.replace("/(tabs)" as never);
        }
        addFoodLoggingBreadcrumb("food_logging.camera_dismissed", {
          job_id: jobId,
        });
      });

      // ── 4. Background analysis (runs after dismiss frame) ───────────────
      const entitlement: "allowed" | "needs_recheck" | "premium_stale" =
        !initialAccess.allowed && initialAccess.reason === "no_credits"
          ? "needs_recheck"
          : initialAccess.allowed && requiresRevalidation
            ? "premium_stale"
            : "allowed";
      const consumeCredit = !isPro;

      setTimeout(() => {
        // Copy the captured photo into the app's document directory under
        // a deterministic <jobId>.jpg path so the thumbnail survives a
        // force-quit. The OS may evict the VisionCamera tmp/cache path
        // between sessions, leaving the Home stack with a broken URI.
        // Best-effort: failure falls back to the original `uri` so we
        // never block the camera dismiss or the analysis pipeline.
        try {
          const durableUri = copyImageToDurableLocation(uri, jobId);
          if (durableUri) {
            useBackgroundScanStore
              .getState()
              .setLocalImageUri(jobId, durableUri);
          }
        } catch {
          // copyImageToDurableLocation already logs; safe to swallow here.
        }

        void runBackgroundScan(jobId, {
          description: desc,
          entitlement,
          consumeCredit,
        });
      }, 0);
    },
    [router, requireAccount, canScan, requiresRevalidation, isPro, user?.id]
  );

  // ── Describe & retry (user types what the food is) ───────────────────

  const handleDescribeAndRetry = useCallback(
    async (
      typed: string,
    ): Promise<{ ok: true } | { ok: false; message?: string }> => {
      const trimmed = typed.trim();
      if (!trimmed) return { ok: false };
      try {
        addFoodLoggingBreadcrumb("food_logging.fallback_lookup_started", {
          length: trimmed.length,
          source: imageUri ? "camera" : "barcode",
        });
        const ok = await startFromInput(trimmed, "camera", {
          foodIdentificationRecoverySource: imageUri ? "camera" : "barcode",
        });
        if (ok) {
          addFoodLoggingBreadcrumb("food_logging.fallback_lookup_success");
          return { ok: true };
        }
        addFoodLoggingBreadcrumb("food_logging.fallback_lookup_no_match");
        return { ok: false };
      } catch (err) {
        reportError(err, {
          area: "scan",
          action: "handleDescribeAndRetry",
          screen: "camera-log",
        });
        return { ok: false };
      }
    },
    [imageUri, startFromInput],
  );

  // ── Close / dismiss ──────────────────────────────────────────────────

  const cancelActiveBarcodeLookup = useCallback(() => {
    barcodeLookupGenRef.current += 1;
    barcodeLockRef.current = false;
    setState("viewfinder");
  }, []);

  const handleClose = useCallback(() => {
    if (state === "looking_up_barcode") {
      cancelActiveBarcodeLookup();
      return;
    }
    setState("dismissing");
    requestAnimationFrame(() => {
      if (router.canDismiss()) {
        router.dismissAll();
      } else {
        router.replace("/(tabs)" as never);
      }
    });
  }, [router, state, cancelActiveBarcodeLookup]);

  // ── Tap-to-focus ─────────────────────────────────────────────────────

  const handleCameraLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setCameraLayout({ width, height });
  }, []);

  const handleTapToFocus = useCallback(
    async (e: GestureResponderEvent) => {
      if (!cameraRef.current || state !== "viewfinder") return;
      const { locationX, locationY } = e.nativeEvent;
      const point = computeFocusPoint(
        locationX,
        locationY,
        cameraLayout.width,
        cameraLayout.height
      );
      setFocusPoint({ x: locationX, y: locationY });
      try {
        await cameraRef.current.focus(point);
      } catch {
        // focus may not be supported on all devices
      }
      // Hide focus ring after a short delay
      setTimeout(() => setFocusPoint(null), 800);
    },
    [state, cameraLayout]
  );

  // ── Capture from live viewfinder ─────────────────────────────────────

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) return;
    if (state !== "viewfinder") return;
    if (captureLockRef.current) return;
    captureLockRef.current = true;
    addFoodLoggingBreadcrumb("food_logging.photo_capture_started");

    try {
      // ONLY native await before dismiss. Speed prioritisation is set via
      // `photoQualityBalance="speed"` on the <Camera> component below — that
      // shaves ~500-1500 ms off the iOS capture path. We disable the shutter
      // sound here so the haptic + UI take over the feedback loop instantly.
      const photo = await cameraRef.current.takePhoto({
        enableShutterSound: false,
      });
      const uri =
        Platform.OS === "android" ? `file://${photo.path}` : photo.path;
      if (!uri) {
        throw new Error("missing_photo_uri");
      }
      addFoodLoggingBreadcrumb("food_logging.photo_captured");
      enqueueScan(uri);
    } catch (err) {
      captureLockRef.current = false;
      reportError(err, {
        area: "scan",
        action: "handleCapture_takePhoto",
        screen: "camera-log",
        extra: { flow: "ai_camera", step: "capture" },
      });
      Alert.alert("Error", t("camera.captureError"));
    }
  }, [enqueueScan, t, state]);

  // ── Pick from gallery ────────────────────────────────────────────────

  const pickFromGallery = useCallback(async () => {
    if (state !== "viewfinder") return;
    try {
      const { status, accessPrivileges } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          t("camera.photoLibraryRequired"),
          t("camera.photoLibraryRequiredDesc"),
          [
            { text: t("common.cancel"), style: "cancel" },
            {
              text: t("camera.openSettings") ?? "Open Settings",
              onPress: () => Linking.openSettings(),
            },
          ]
        );
        return;
      }

      // If the user only granted limited access, prompt them to allow full access
      if (accessPrivileges === "limited") {
        Alert.alert(
          "Limited Photo Access",
          "You've only allowed access to selected photos. For the best experience, allow access to your full photo library in Settings.",
          [
            { text: "Continue Anyway", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ]
        );
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      const pickedUri = result.assets[0].uri;
      // Small delay so the native picker sheet finishes its dismiss animation
      // before we start the pipeline and dismiss the camera modal.
      // Without this, two modal dismissals race on iOS and crash the navigator.
      setTimeout(() => enqueueScan(pickedUri), 150);
    } catch {
      Alert.alert("Error", t("camera.pickImageError"));
    }
  }, [enqueueScan, t, state]);

  // ── No permission state ─────────────────────────────────────────────

  if (!hasPermission) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </Pressable>
            <TText
              variant="heading"
              style={[styles.headerTitle, { color: theme.colors.text }]}
            >
              {t("camera.scanFood")}
            </TText>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.centeredContent}>
            <View
              style={[
                styles.iconBubble,
                { backgroundColor: theme.colors.primary + "1A" },
              ]}
            >
              <Ionicons
                name="camera-outline"
                size={48}
                color={theme.colors.primary}
              />
            </View>
            <TSpacer size="lg" />
            <TText
              variant="heading"
              style={[styles.permTitle, { color: theme.colors.text }]}
            >
              {t("camera.cameraAccessNeeded")}
            </TText>
            <TSpacer size="sm" />
            <TText
              style={[
                styles.permDescription,
                { color: theme.colors.textSecondary },
              ]}
            >
              {t("camera.cameraAccessNeededDesc")}
            </TText>
            <TSpacer size="xl" />
            <Pressable
              onPress={handleRequestPermission}
              style={({ pressed }) => [
                styles.permBtn,
                {
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.permBtnGradient}
              >
                <Ionicons
                  name="camera"
                  size={20}
                  color={theme.colors.textInverse}
                />
                <TText
                  style={[
                    styles.permBtnText,
                    { color: theme.colors.textInverse },
                  ]}
                >
                  {t("camera.enableCamera")}
                </TText>
              </LinearGradient>
            </Pressable>
            <TSpacer size="md" />
            <Pressable onPress={pickFromGallery} style={[styles.galleryAltBtn]}>
              <TText
                style={[styles.galleryAltText, { color: theme.colors.primary }]}
              >
                {t("camera.chooseFromGallery")}
              </TText>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ── No camera device ────────────────────────────────────────────────

  if (!device) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </Pressable>
            <TText
              variant="heading"
              style={[styles.headerTitle, { color: theme.colors.text }]}
            >
              {t("camera.scanFood")}
            </TText>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.centeredContent}>
            <TText
              style={[
                styles.permDescription,
                { color: theme.colors.textMuted },
              ]}
            >
              {t("camera.noCameraDevice")}
            </TText>
            <TSpacer size="lg" />
            <Pressable onPress={pickFromGallery}>
              <TText style={{ color: theme.colors.primary, fontWeight: "600" }}>
                {t("camera.chooseFromGalleryInstead")}
              </TText>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          // The Camera view stays mounted during dismiss (just isActive=false)
          // so iOS has the live viewfinder to slide off-screen with — no
          // empty/black frame between camera and home.
          backgroundColor: "#000",
        },
      ]}
    >
      {/* ── Viewfinder ─────────────────────────────────────────────── */}
      {/*
        Mount the Camera for both `viewfinder` AND `dismissing` states. The
        only thing that changes during dismiss is `isActive=false`, which
        lets VisionCamera tear down the AVCaptureSession asynchronously.
        Unmounting the Camera while it's still active blocks the JS thread
        for several seconds — that was the real source of the 10 s hang.
      */}
      {(state === "viewfinder" ||
        state === "dismissing" ||
        state === "looking_up_barcode") && (
        <Pressable
          style={styles.viewfinderContainer}
          onPress={state === "viewfinder" ? handleTapToFocus : undefined}
          onLayout={handleCameraLayout}
          // Once we're dismissing, ignore further taps but keep the view in
          // the tree so iOS has something to slide off-screen with.
          pointerEvents={
            state === "viewfinder" || state === "looking_up_barcode"
              ? "auto"
              : "none"
          }
        >
          <Camera
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={
              state === "viewfinder" || state === "looking_up_barcode"
            }
            photo={true}
            photoQualityBalance="speed"
            torch={state === "viewfinder" ? torch : "off"}
            codeScanner={state === "viewfinder" ? codeScanner : undefined}
          />

          {/* Focus ring indicator */}
          {state === "viewfinder" && focusPoint && (
            <View
              pointerEvents="none"
              style={[
                styles.focusRing,
                { left: focusPoint.x - 30, top: focusPoint.y - 30 },
              ]}
            />
          )}

          {/* Top overlay: title + close */}
          <SafeAreaView style={styles.viewfinderOverlay} edges={["top"]}>
            <View style={styles.vfHeader}>
              <View style={{ width: 40 }} />
              <TText style={styles.vfTitle}>{t("camera.scanFood")}</TText>
              <Pressable
                onPress={handleClose}
                hitSlop={12}
                style={styles.vfHeaderBtn}
              >
                <Ionicons name="close" size={22} color="#fff" />
              </Pressable>
            </View>
          </SafeAreaView>

          {/* Scan frame overlay */}
          <View style={styles.scanFrameContainer} pointerEvents="none">
            <View style={styles.scanFrame}>
              {/* Corner accents */}
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <TSpacer size="md" />
            <TText style={styles.scanHint}>{t("camera.scanHint")}</TText>
            {!isPro && (
              <TText style={styles.scanCredits}>
                {t("camera.freeScansRemaining", { count: scansRemaining })}
              </TText>
            )}
          </View>

          {/* Bottom controls */}
          <SafeAreaView style={styles.vfBottomBar} edges={["bottom"]}>
            <View style={styles.vfControls}>
              {/* Gallery */}
              <Pressable
                onPress={pickFromGallery}
                style={styles.vfSecondaryBtn}
              >
                <Ionicons name="images-outline" size={24} color="#fff" />
              </Pressable>

              {/* Shutter */}
              <Pressable
                onPress={handleCapture}
                style={({ pressed }) => [
                  styles.shutterOuter,
                  { transform: [{ scale: pressed ? 0.92 : 1 }] },
                ]}
              >
                <View style={styles.shutterInner} />
              </Pressable>

              {/* Flash toggle (bottom right) */}
              <Pressable
                onPress={() => setTorch((t) => (t === "off" ? "on" : "off"))}
                hitSlop={12}
                style={[
                  styles.vfSecondaryBtn,
                  torch === "on" && styles.vfHeaderBtnActive,
                ]}
              >
                <Ionicons
                  name={torch === "on" ? "flash" : "flash-outline"}
                  size={22}
                  color="#fff"
                />
              </Pressable>
            </View>
          </SafeAreaView>
        </Pressable>
      )}

      {/* ── Error — analysis failed or no result ──────────────────── */}
      {state === "error" && (
        <FoodIdentificationFallback
          source={imageUri ? "camera" : "barcode"}
          imageUri={imageUri}
          barcode={failedBarcode}
          initialQuery={description}
          errorReason={
            imageUri ? "no_food_detected" : barcodeErrorReason
          }
          onBack={() => {
            setImageUri(null);
            setDescription("");
            setFailedBarcode(null);
            setBarcodeErrorReason("barcode_not_found");
            setState("viewfinder");
          }}
          onRetry={
            imageUri
              ? () => {
                  setDescription("");
                  enqueueScan(imageUri);
                }
              : failedBarcode
                ? () => {
                    // Re-attempt the same barcode lookup. Reset the lock so
                    // handleBarcodeScanned doesn't early-return; force the
                    // state back to viewfinder so the gate inside passes.
                    const code = failedBarcode;
                    barcodeLockRef.current = false;
                    setFailedBarcode(null);
                    setState("viewfinder");
                    requestAnimationFrame(() => {
                      void handleBarcodeScanned(code, "retry");
                    });
                  }
                : undefined
          }
          onRetake={() => {
            setImageUri(null);
            setDescription("");
            setFailedBarcode(null);
            setBarcodeErrorReason("barcode_not_found");
            setState("viewfinder");
          }}
          onAddManually={() => {
            setState("dismissing");
            requestAnimationFrame(() => {
              router.replace("/(modals)/manual-log" as never);
            });
          }}
          onResolveQuery={async (typed) => {
            setDescription(typed);
            return handleDescribeAndRetry(typed);
          }}
        />
      )}

      {/* ── Camera teardown / navigation hand-off (barcode + photo pipeline) ──
          No loading overlay — user returns to the home tab immediately while
          analysis runs in the background; results appear on the home screen. */}
      {state === "dismissing" && (
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: theme.colors.background },
          ]}
          pointerEvents="none"
        />
      )}

      {/* ── Scan credits gate paywall ── */}
      <FeatureGatePaywall
        visible={showScanGate}
        onDismiss={() => setShowScanGate(false)}
        feature="unlimited_scans"
      />

      {/* ── Auth gate modal ── */}
      <AuthGateModal
        visible={gateVisible}
        onDismiss={dismissGate}
        reason={gateReason}
      />
    </View>
  );
}

export default function CameraLoggingScreen() {
  return (
    <FoodLoggingErrorBoundary routeLabel="/(modals)/camera-log">
      <CameraLoggingScreenInner />
    </FoodLoggingErrorBoundary>
  );
}

const CORNER_SIZE = 28;
const CORNER_THICKNESS = 3;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  centeredContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  // ── Permission ──
  iconBubble: {
    width: 100,
    height: 100,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  permTitle: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  permDescription: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  permBtn: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
  },
  permBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  permBtnText: {
    fontSize: 17,
    fontWeight: "700",
  },
  galleryAltBtn: {
    paddingVertical: 8,
  },
  galleryAltText: {
    fontSize: 15,
    fontWeight: "600",
  },
  // ── Viewfinder ──
  viewfinderContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  viewfinderOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  vfHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  vfHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  vfHeaderBtnActive: {
    backgroundColor: "rgba(255,200,0,0.35)",
  },
  focusRing: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.8)",
    zIndex: 20,
  },
  vfTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  scanFrameContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
  },
  scanFrame: {
    width: 260,
    height: 260,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderColor: "rgba(255,255,255,0.8)",
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderColor: "rgba(255,255,255,0.8)",
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderColor: "rgba(255,255,255,0.8)",
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderColor: "rgba(255,255,255,0.8)",
    borderBottomRightRadius: 8,
  },
  scanHint: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 14,
    fontWeight: "500",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  scanCredits: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    fontWeight: "400",
    marginTop: 4,
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  vfBottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  vfControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 20,
    paddingHorizontal: 30,
  },
  vfSecondaryBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#fff",
  },
});
