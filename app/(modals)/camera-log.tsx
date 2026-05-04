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
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    type GestureResponderEvent,
    type LayoutChangeEvent,
    Linking,
    Platform,
    Pressable,
    StyleSheet,
    TextInput,
    View,
} from "react-native";
import Animated, {
    FadeIn,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    Camera,
    useCameraDevice,
    useCameraPermission,
    useCodeScanner,
} from "react-native-vision-camera";
import { useAccountGate } from "../../src/features/auth/useAccountGate";
import {
    computeFocusPoint,
    deactivateCameraBeforeDismiss,
} from "../../src/features/camera/camera-log.helpers";
import {
    foodLogBreadcrumb,
    truncateFoodLogText,
} from "../../src/features/food-logging/food-logging-telemetry";
import { useLoggingFlow } from "../../src/features/nutrition/use-logging-flow";
import { useFeatureAccess } from "../../src/features/subscription/useFeatureAccess";
import { useTheme } from "../../src/theme/useTheme";
import { AuthGateModal } from "../../src/ui/components/AuthGateModal";
import { FeatureGatePaywall } from "../../src/ui/components/FeatureGatePaywall";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";

type CameraState = "viewfinder" | "analyzing" | "error";

const STAGE_LABELS = [
  "Detecting food…",
  "Reading packaging…",
  "Matching product…",
  "Estimating nutrition…",
];

/** Canonical confirm destination (paired with `CAMERA_LOG_ROUTE` for camera flow). */
const CONFIRM_MEAL_ROUTE = "/(modals)/confirm-meal" as const;

const DESCRIBE_RETRY_FAILURE_MESSAGE =
  "We couldn't identify the food from that description. Try adding more detail or log it manually.";

/* ── Pulsing image component for analyzing state ── */
function PulsingImage({ uri }: { uri: string }) {
  const scale = useSharedValue(1);

  React.useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 900 }),
        withTiming(1, { duration: 900 })
      ),
      -1,
      true
    );
  }, [scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      <Image
        source={{ uri }}
        style={styles.analyzingImage}
        contentFit="cover"
      />
    </Animated.View>
  );
}

export default function CameraLoggingScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { startFromImage, startFromInput, startFromBarcode } = useLoggingFlow();
  const { requireAccount, gateVisible, gateReason, dismissGate } =
    useAccountGate();
  const { canScan, consumeScan, scansRemaining, isPro } = useFeatureAccess();
  const [showScanGate, setShowScanGate] = useState(false);

  const cameraRef = useRef<Camera>(null);
  const device = useCameraDevice("back");
  const { hasPermission, requestPermission } = useCameraPermission();

  const [state, setState] = useState<CameraState>("viewfinder");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [torch, setTorch] = useState<"off" | "on">("off");
  const [stageIndex, setStageIndex] = useState(0);
  const [description, setDescription] = useState("");
  /** Prevents duplicate capture / pipeline / barcode while work is in flight */
  const pipelineBusyRef = useRef(false);
  const cameraScreenLoggedRef = useRef(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraLayout, setCameraLayout] = useState({ width: 0, height: 0 });
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(
    null
  );

  const releasePipelineLock = useCallback(() => {
    pipelineBusyRef.current = false;
    setIsProcessing(false);
  }, []);

  const tryAcquirePipelineLock = useCallback((): boolean => {
    if (pipelineBusyRef.current) return false;
    pipelineBusyRef.current = true;
    setIsProcessing(true);
    return true;
  }, []);

  // ── Barcode scanner ──────────────────────────────────────────────────

  const handleBarcodeScanned = useCallback(
    async (payload: { value: string; symbology: string }) => {
      const { value, symbology } = payload;
      if (state !== "viewfinder") return;
      if (!tryAcquirePipelineLock()) return;
      setTorch("off");
      setState("analyzing");
      foodLogBreadcrumb("food_logging.barcode_detected", {
        flow: "barcode",
        step: "scan",
        symbology,
        codeLength: value.length,
      });
      foodLogBreadcrumb("food_logging.barcode_pipeline_started", {
        flow: "barcode",
        step: "lookup",
      });
      try {
        const success = await startFromBarcode(value);
        if (success) {
          foodLogBreadcrumb("food_logging.barcode_pipeline_success", {
            flow: "barcode",
            step: "lookup",
          });
          releasePipelineLock();
          router.push(CONFIRM_MEAL_ROUTE as never);
        } else {
          foodLogBreadcrumb("food_logging.barcode_pipeline_failed", {
            flow: "barcode",
            step: "lookup",
            reason: "not_found",
          });
          setState("error");
          releasePipelineLock();
        }
      } catch {
        foodLogBreadcrumb("food_logging.barcode_pipeline_failed", {
          flow: "barcode",
          step: "lookup",
          reason: "exception",
        });
        setState("error");
        releasePipelineLock();
      }
    },
    [
      startFromBarcode,
      router,
      state,
      tryAcquirePipelineLock,
      releasePipelineLock,
    ]
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
      const first = codes[0];
      if (first?.value) {
        handleBarcodeScanned({
          value: first.value,
          symbology: String((first as { type?: string }).type ?? "unknown"),
        });
      }
    },
  });

  // ── Cycle stage labels while analyzing ───────────────────────────────

  useEffect(() => {
    if (state !== "analyzing") return;
    setStageIndex(0);
    const interval = setInterval(() => {
      setStageIndex((i) => (i + 1) % STAGE_LABELS.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [state]);

  // ── Telemetry: mount + permission snapshot ───────────────────────────

  useEffect(() => {
    if (!cameraScreenLoggedRef.current) {
      cameraScreenLoggedRef.current = true;
      foodLogBreadcrumb("food_logging.camera_opened", {
        flow: "ai_camera",
        step: "screen_mount",
        route: "camera-log",
      });
    }
    foodLogBreadcrumb("food_logging.camera_permission_status", {
      flow: "ai_camera",
      step: "permission",
      granted: hasPermission,
    });
  }, [hasPermission]);

  // ── Permission handling ──────────────────────────────────────────────

  const handleRequestPermission = useCallback(async () => {
    const granted = await requestPermission();
    foodLogBreadcrumb("food_logging.camera_permission_status", {
      flow: "ai_camera",
      step: "after_request",
      granted,
    });
    if (!granted) {
      foodLogBreadcrumb("food_logging.camera_permission_denied", {
        flow: "ai_camera",
        step: "permission",
      });
      Alert.alert(
        "Camera Access Required",
        "Please allow camera access in Settings to scan food.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open Settings",
            onPress: () => Linking.openSettings(),
          },
        ]
      );
    }
  }, [requestPermission]);

  // ── Run pipeline (called automatically after capture/pick) ───────────

  const runPipeline = useCallback(
    async (
      uri: string,
      desc?: string,
      options?: { alreadyLocked?: boolean }
    ) => {
      if (!options?.alreadyLocked) {
        if (!tryAcquirePipelineLock()) return;
      }
      // Gate: require account + scan credits for AI scans
      if (!requireAccount("scan")) {
        releasePipelineLock();
        return;
      }
      const access = canScan();
      if (!access.allowed) {
        setShowScanGate(true);
        releasePipelineLock();
        return;
      }

      setImageUri(uri);
      setTorch("off");
      setState("analyzing");
      setDescription("");
      try {
        const success = await startFromImage(uri, desc);
        console.log(
          "[CameraLog] runPipeline — startFromImage returned:",
          success
        );
        if (success) {
          await consumeScan();
          releasePipelineLock();
          console.log("[CameraLog] runPipeline — navigating to confirm-meal");
          router.push(CONFIRM_MEAL_ROUTE as never);
        } else {
          setState("error");
          releasePipelineLock();
        }
      } catch {
        setState("error");
        releasePipelineLock();
      }
    },
    [
      startFromImage,
      router,
      requireAccount,
      canScan,
      consumeScan,
      tryAcquirePipelineLock,
      releasePipelineLock,
    ]
  );

  // ── Describe & retry (user types what the food is) ───────────────────

  const handleDescribeAndRetry = useCallback(async () => {
    if (!description.trim()) return;
    if (!tryAcquirePipelineLock()) return;
    setState("analyzing");
    try {
      const ok = await startFromInput(description.trim(), "camera");
      if (!ok) {
        foodLogBreadcrumb("food_logging.describe_retry_failed", {
          flow: "ai_camera",
          step: "describe_retry",
          textTruncated: truncateFoodLogText(description),
        });
        setState("error");
        releasePipelineLock();
        Alert.alert("No match", DESCRIBE_RETRY_FAILURE_MESSAGE);
        return;
      }
      releasePipelineLock();
    } catch {
      setState("error");
      releasePipelineLock();
      foodLogBreadcrumb("food_logging.describe_retry_failed", {
        flow: "ai_camera",
        step: "describe_retry",
        reason: "exception",
      });
    }
  }, [
    description,
    startFromInput,
    tryAcquirePipelineLock,
    releasePipelineLock,
  ]);

  // ── Close / dismiss ──────────────────────────────────────────────────

  const handleClose = useCallback(() => {
    deactivateCameraBeforeDismiss(
      () => setState("analyzing"), // deactivates camera via isActive check
      () => router.back()
    );
  }, [router]);

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
    if (!tryAcquirePipelineLock()) return;
    foodLogBreadcrumb("food_logging.photo_capture_started", {
      flow: "ai_camera",
      step: "shutter",
    });
    try {
      const photo = await cameraRef.current.takePhoto({});
      const uri =
        Platform.OS === "android" ? `file://${photo.path}` : photo.path;
      foodLogBreadcrumb("food_logging.photo_captured", {
        flow: "ai_camera",
        step: "shutter",
      });
      await runPipeline(uri, undefined, { alreadyLocked: true });
    } catch {
      foodLogBreadcrumb("food_logging.photo_capture_failed", {
        flow: "ai_camera",
        step: "shutter",
      });
      releasePipelineLock();
      Alert.alert("Error", "Failed to capture photo. Please try again.");
    }
  }, [runPipeline, tryAcquirePipelineLock, releasePipelineLock]);

  // ── Pick from gallery ────────────────────────────────────────────────

  const pickFromGallery = useCallback(async () => {
    if (!tryAcquirePipelineLock()) return;
    foodLogBreadcrumb("food_logging.gallery_opened", {
      flow: "ai_camera",
      step: "picker",
    });
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        releasePipelineLock();
        Alert.alert(
          "Photo Library Access Required",
          "Please allow photo library access in Settings to select food photos.",
          [{ text: "OK" }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (result.canceled) {
        foodLogBreadcrumb("food_logging.gallery_cancelled", {
          flow: "ai_camera",
          step: "picker",
        });
        releasePipelineLock();
        return;
      }

      const uri = result.assets?.[0]?.uri;
      if (!uri) {
        releasePipelineLock();
        return;
      }

      foodLogBreadcrumb("food_logging.gallery_selected", {
        flow: "ai_camera",
        step: "picker",
      });
      await runPipeline(uri, undefined, { alreadyLocked: true });
    } catch {
      foodLogBreadcrumb("food_logging.gallery_failed", {
        flow: "ai_camera",
        step: "picker",
      });
      releasePipelineLock();
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  }, [runPipeline, tryAcquirePipelineLock, releasePipelineLock]);

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
              Scan Food
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
              Camera Access Needed
            </TText>
            <TSpacer size="sm" />
            <TText
              style={[
                styles.permDescription,
                { color: theme.colors.textSecondary },
              ]}
            >
              Caloric needs camera access to scan and{"\n"}identify food for
              calorie tracking.
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
                  Enable Camera
                </TText>
              </LinearGradient>
            </Pressable>
            <TSpacer size="md" />
            <Pressable onPress={pickFromGallery} style={[styles.galleryAltBtn]}>
              <TText
                style={[styles.galleryAltText, { color: theme.colors.primary }]}
              >
                Or choose from gallery
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
              Scan Food
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
              No camera device found.
            </TText>
            <TSpacer size="lg" />
            <Pressable onPress={pickFromGallery}>
              <TText style={{ color: theme.colors.primary, fontWeight: "600" }}>
                Choose from gallery instead
              </TText>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── Viewfinder ─────────────────────────────────────────────── */}
      {state === "viewfinder" && (
        <Pressable
          style={styles.viewfinderContainer}
          onPress={handleTapToFocus}
          onLayout={handleCameraLayout}
        >
          <Camera
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={state === "viewfinder"}
            photo={true}
            torch={torch}
            codeScanner={codeScanner}
          />

          {/* Focus ring indicator */}
          {focusPoint && (
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
              <TText style={styles.vfTitle}>Scan Food</TText>
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
            <TText style={styles.scanHint}>
              Point at food or scan a barcode
            </TText>
            {!isPro && (
              <TText style={styles.scanCredits}>
                {scansRemaining} free scan{scansRemaining !== 1 ? "s" : ""}{" "}
                remaining
              </TText>
            )}
          </View>

          {/* Bottom controls */}
          <SafeAreaView style={styles.vfBottomBar} edges={["bottom"]}>
            <View style={styles.vfControls}>
              {/* Gallery */}
              <Pressable
                onPress={pickFromGallery}
                disabled={isProcessing}
                style={styles.vfSecondaryBtn}
              >
                <Ionicons name="images-outline" size={24} color="#fff" />
              </Pressable>

              {/* Shutter */}
              <Pressable
                onPress={handleCapture}
                disabled={isProcessing}
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

      {/* ── Analyzing — auto-triggered after capture ──────────────── */}
      {state === "analyzing" && (
        <View
          style={[
            styles.container,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
            {/* Header with cancel */}
            <View style={styles.header}>
              <Pressable
                onPress={() => {
                  setImageUri(null);
                  setState("viewfinder");
                  releasePipelineLock();
                }}
                hitSlop={12}
              >
                <Ionicons
                  name="chevron-back"
                  size={24}
                  color={theme.colors.text}
                />
              </Pressable>
              <TText
                variant="heading"
                style={[styles.headerTitle, { color: theme.colors.text }]}
              >
                Analyzing
              </TText>
              <View style={{ width: 24 }} />
            </View>

            <View style={styles.centeredContent}>
              {/* Captured image with pulse */}
              {imageUri && (
                <Animated.View entering={FadeIn.duration(300)}>
                  <PulsingImage uri={imageUri} />
                </Animated.View>
              )}

              <TSpacer size="xl" />

              {/* Spinner + stage label */}
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <TSpacer size="md" />
              <Animated.View key={stageIndex} entering={FadeIn.duration(300)}>
                <TText
                  style={[
                    styles.analyzingText,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  {STAGE_LABELS[stageIndex]}
                </TText>
              </Animated.View>

              <TSpacer size="xl" />

              {/* Progress dots */}
              <View style={styles.dotsRow}>
                {STAGE_LABELS.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      {
                        backgroundColor:
                          i <= stageIndex
                            ? theme.colors.primary
                            : theme.colors.border,
                      },
                    ]}
                  />
                ))}
              </View>
            </View>
          </SafeAreaView>
        </View>
      )}

      {/* ── Error — analysis failed or no result ──────────────────── */}
      {state === "error" && (
        <View
          style={[
            styles.container,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
            <View style={styles.header}>
              <Pressable
                onPress={() => {
                  setImageUri(null);
                  setDescription("");
                  setState("viewfinder");
                  releasePipelineLock();
                }}
                hitSlop={12}
              >
                <Ionicons
                  name="chevron-back"
                  size={24}
                  color={theme.colors.text}
                />
              </Pressable>
              <TText
                variant="heading"
                style={[styles.headerTitle, { color: theme.colors.text }]}
              >
                Couldn&apos;t Identify
              </TText>
              <View style={{ width: 24 }} />
            </View>

            <View style={styles.errorContent}>
              {/* Show captured image */}
              {imageUri && (
                <Animated.View entering={FadeIn.duration(300)}>
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.errorImage}
                    contentFit="cover"
                  />
                </Animated.View>
              )}

              <TSpacer size="lg" />

              <Ionicons
                name="alert-circle-outline"
                size={40}
                color={theme.colors.warning ?? "#F59E0B"}
              />
              <TSpacer size="md" />
              <TText style={[styles.errorTitle, { color: theme.colors.text }]}>
                We couldn&apos;t identify this food
              </TText>
              <TSpacer size="xs" />
              <TText
                style={[
                  styles.errorSubtitle,
                  { color: theme.colors.textMuted },
                ]}
              >
                Describe what you see and we&apos;ll look it up
              </TText>

              <TSpacer size="lg" />

              {/* Description input */}
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="e.g., Walkers Sensations Thai Sweet Chilli crisps"
                placeholderTextColor={theme.colors.textMuted}
                style={[
                  styles.errorInput,
                  {
                    color: theme.colors.text,
                    backgroundColor: theme.colors.surfaceSecondary,
                    borderColor: description.trim()
                      ? theme.colors.primary + "60"
                      : theme.colors.border,
                  },
                ]}
                multiline
                numberOfLines={2}
                autoFocus
              />

              <TSpacer size="md" />

              {/* Action buttons */}
              <Pressable
                onPress={handleDescribeAndRetry}
                disabled={!description.trim() || isProcessing}
                style={({ pressed }) => [
                  styles.errorPrimaryBtn,
                  {
                    backgroundColor: theme.colors.primary,
                    opacity:
                      !description.trim() || isProcessing
                        ? 0.4
                        : pressed
                          ? 0.9
                          : 1,
                  },
                ]}
              >
                <Ionicons name="search" size={18} color="#fff" />
                <TText style={styles.errorPrimaryBtnText}>Look it up</TText>
              </Pressable>

              <TSpacer size="sm" />

              <View style={styles.errorSecondaryRow}>
                <Pressable
                  onPress={() => {
                    if (imageUri) runPipeline(imageUri);
                  }}
                  style={[
                    styles.errorSecondaryBtn,
                    { backgroundColor: theme.colors.surfaceSecondary },
                  ]}
                >
                  <Ionicons
                    name="refresh"
                    size={16}
                    color={theme.colors.text}
                  />
                  <TText
                    style={[
                      styles.errorSecondaryBtnText,
                      { color: theme.colors.text },
                    ]}
                  >
                    Retry
                  </TText>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setImageUri(null);
                    setDescription("");
                    setState("viewfinder");
                    releasePipelineLock();
                  }}
                  style={[
                    styles.errorSecondaryBtn,
                    { backgroundColor: theme.colors.surfaceSecondary },
                  ]}
                >
                  <Ionicons name="camera" size={16} color={theme.colors.text} />
                  <TText
                    style={[
                      styles.errorSecondaryBtnText,
                      { color: theme.colors.text },
                    ]}
                  >
                    Retake
                  </TText>
                </Pressable>
              </View>
            </View>
          </SafeAreaView>
        </View>
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
  // ── Analyzing ──
  analyzingImage: {
    width: 180,
    height: 180,
    borderRadius: 24,
  },
  analyzingText: {
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
  },
  dotsRow: {
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  // ── Error state ──
  errorContent: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  errorImage: {
    width: 140,
    height: 140,
    borderRadius: 20,
    opacity: 0.7,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  errorSubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  errorInput: {
    width: "100%",
    fontSize: 15,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 56,
    textAlignVertical: "top",
  },
  errorPrimaryBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  errorPrimaryBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  errorSecondaryRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  errorSecondaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorSecondaryBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
