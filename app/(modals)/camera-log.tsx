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
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Linking,
    Platform,
    Pressable,
    StyleSheet,
    TextInput,
    View,
} from "react-native";
import Animated, {
    FadeIn,
    FadeOut,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from "react-native-reanimated";
import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
    Camera,
    type Code,
    type CodeScannerFrame,
    useCameraDevice,
    useCameraPermission,
    useCodeScanner,
} from "react-native-vision-camera";
import { useLoggingFlow } from "../../src/features/nutrition/use-logging-flow";
import { useTheme } from "../../src/theme/useTheme";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";

type CameraState = "viewfinder" | "analyzing" | "error";

const STAGE_LABELS = [
  "Detecting food…",
  "Reading packaging…",
  "Matching product…",
  "Estimating nutrition…",
];

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
  const insets = useSafeAreaInsets();
  const screenW = Dimensions.get("window").width;
  const screenH = Dimensions.get("window").height;

  const cameraRef = useRef<Camera>(null);
  const device = useCameraDevice("back");
  const { hasPermission, requestPermission } = useCameraPermission();

  const [state, setState] = useState<CameraState>("viewfinder");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [torch, setTorch] = useState<"off" | "on">("off");
  const [stageIndex, setStageIndex] = useState(0);
  const [description, setDescription] = useState("");

  // ── Barcode scanning state ───────────────────────────────────────────
  const [barcodeHighlight, setBarcodeHighlight] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [barcodeValue, setBarcodeValue] = useState<string | null>(null);
  const isProcessingBarcode = useRef(false);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Code scanner for real-time barcode detection ─────────────────────
  const codeScanner = useCodeScanner(
    useMemo(
      () => ({
        codeTypes: ["ean-13", "ean-8", "upc-a", "upc-e", "code-128", "code-39"],
        onCodeScanned: (codes: Code[], frame: CodeScannerFrame) => {
          if (state !== "viewfinder" || isProcessingBarcode.current) return;

          const code = codes[0];
          if (!code?.value) return;

          // Map barcode frame coordinates to screen coordinates
          if (code.frame && frame.width > 0 && frame.height > 0) {
            const scaleX = screenW / frame.width;
            const scaleY = screenH / frame.height;
            setBarcodeHighlight({
              x: code.frame.x * scaleX,
              y: code.frame.y * scaleY,
              width: code.frame.width * scaleX,
              height: code.frame.height * scaleY,
            });
          }

          setBarcodeValue(code.value);

          // Clear highlight after a short delay if not processed
          if (highlightTimer.current) clearTimeout(highlightTimer.current);
          highlightTimer.current = setTimeout(() => {
            setBarcodeHighlight(null);
            setBarcodeValue(null);
          }, 1500);

          // Auto-process the barcode
          isProcessingBarcode.current = true;
          (async () => {
            try {
              setState("analyzing");
              setTorch("off");
              const success = await startFromBarcode(code.value!);
              if (success) {
                router.push("/(modals)/confirm-meal" as never);
                setState("viewfinder");
                setImageUri(null);
              } else {
                // Barcode not found in database — fall back to photo capture
                setState("viewfinder");
                Alert.alert(
                  "Product Not Found",
                  `Barcode ${code.value} wasn't found in our database. Try taking a photo of the packaging instead.`,
                  [{ text: "OK" }]
                );
              }
            } catch {
              setState("viewfinder");
            } finally {
              isProcessingBarcode.current = false;
              setBarcodeHighlight(null);
              setBarcodeValue(null);
            }
          })();
        },
      }),
      [state, screenW, screenH, startFromBarcode, router]
    )
  );

  // ── Cycle stage labels while analyzing ───────────────────────────────

  useEffect(() => {
    if (state !== "analyzing") return;
    setStageIndex(0);
    const interval = setInterval(() => {
      setStageIndex((i) => (i + 1) % STAGE_LABELS.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [state]);

  // ── Permission handling ──────────────────────────────────────────────

  const handleRequestPermission = useCallback(async () => {
    const granted = await requestPermission();
    if (!granted) {
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
    async (uri: string, desc?: string) => {
      setImageUri(uri);
      setTorch("off");
      setState("analyzing");
      setDescription("");
      try {
        const success = await startFromImage(uri, desc);
        if (success) {
          // Draft is populated with real data — navigate to confirm
          router.push("/(modals)/confirm-meal" as never);
          // Reset camera so returning shows viewfinder, not stuck animation
          setState("viewfinder");
          setImageUri(null);
        } else {
          // Pipeline returned no usable result
          setState("error");
        }
      } catch {
        setState("error");
      }
    },
    [startFromImage, router]
  );

  // ── Describe & retry (user types what the food is) ───────────────────

  const handleDescribeAndRetry = useCallback(async () => {
    if (!description.trim()) return;
    setState("analyzing");
    try {
      // Use text pipeline with the description
      await startFromInput(description.trim(), "camera");
      router.push("/(modals)/confirm-meal" as never);
    } catch {
      setState("error");
    }
  }, [description, startFromInput, router]);

  // ── Capture from live viewfinder ─────────────────────────────────────

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePhoto({});
      const uri =
        Platform.OS === "android" ? `file://${photo.path}` : photo.path;
      runPipeline(uri);
    } catch {
      Alert.alert("Error", "Failed to capture photo. Please try again.");
    }
  }, [runPipeline]);

  // ── Pick from gallery ────────────────────────────────────────────────

  const pickFromGallery = useCallback(async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
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

      if (result.canceled || !result.assets?.[0]?.uri) return;

      runPipeline(result.assets[0].uri);
    } catch {
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  }, [runPipeline]);

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
        <View style={styles.viewfinderContainer}>
          <Camera
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={state === "viewfinder"}
            photo={true}
            torch={torch}
            codeScanner={codeScanner}
          />

          {/* Barcode highlight overlay */}
          {barcodeHighlight && (
            <Animated.View
              entering={FadeIn.duration(150)}
              exiting={FadeOut.duration(200)}
              pointerEvents="none"
              style={[
                styles.barcodeHighlight,
                {
                  left: barcodeHighlight.x - 4,
                  top: barcodeHighlight.y - 4,
                  width: barcodeHighlight.width + 8,
                  height: barcodeHighlight.height + 8,
                },
              ]}
            >
              <View style={styles.barcodeLabel}>
                <Ionicons name="barcode-outline" size={14} color="#fff" />
                <TText style={styles.barcodeLabelText}>
                  {barcodeValue ?? "Scanning…"}
                </TText>
              </View>
            </Animated.View>
          )}

          {/* Top overlay: close + flash + title */}
          <View style={[styles.viewfinderOverlay, { paddingTop: insets.top }]}>
            <View style={styles.vfHeader}>
              <Pressable
                onPress={() => router.back()}
                hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                style={styles.vfHeaderBtn}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </Pressable>
              <TText style={styles.vfTitle}>Scan Food</TText>
              <View style={{ width: 36 }} />
            </View>
          </View>

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
            <View style={styles.scanHintContainer}>
              <View style={styles.scanHintRow}>
                <Ionicons
                  name="camera-outline"
                  size={16}
                  color="rgba(255,255,255,0.85)"
                />
                <TText style={styles.scanHint}>Snap a photo of your food</TText>
              </View>
              <View style={styles.scanHintDivider} />
              <View style={styles.scanHintRow}>
                <Ionicons
                  name="barcode-outline"
                  size={16}
                  color="rgba(255,255,255,0.85)"
                />
                <TText style={styles.scanHint}>
                  Or point at a barcode to scan
                </TText>
              </View>
            </View>
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

              {/* Flash toggle */}
              <Pressable
                onPress={() => setTorch((t) => (t === "off" ? "on" : "off"))}
                hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                style={[
                  styles.vfSecondaryBtn,
                  torch === "on" && styles.vfHeaderBtnActive,
                ]}
              >
                <Ionicons
                  name={torch === "on" ? "flash" : "flash-outline"}
                  size={24}
                  color="#fff"
                />
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      )}

      {/* ── Analyzing — auto-triggered after capture ──────────────── */}
      {state === "analyzing" && (
        <View
          style={[
            styles.container,
            {
              backgroundColor: theme.colors.background,
              paddingTop: insets.top,
            },
          ]}
        >
          {/* Header with cancel */}
          <View style={styles.headerWide}>
            <Pressable
              onPress={() => {
                setImageUri(null);
                setState("viewfinder");
              }}
              hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
              style={styles.backBtn}
            >
              <Ionicons
                name="chevron-back"
                size={28}
                color={theme.colors.text}
              />
            </Pressable>
            <TText
              variant="heading"
              style={[styles.headerTitle, { color: theme.colors.text }]}
            >
              Analyzing
            </TText>
            <View style={{ width: 44 }} />
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
        </View>
      )}

      {/* ── Error — analysis failed or no result ──────────────────── */}
      {state === "error" && (
        <View
          style={[
            styles.container,
            {
              backgroundColor: theme.colors.background,
              paddingTop: insets.top,
            },
          ]}
        >
          <SafeAreaView style={styles.safe} edges={["bottom"]}>
            <View style={styles.headerWide}>
              <Pressable
                onPress={() => {
                  setImageUri(null);
                  setDescription("");
                  setState("viewfinder");
                }}
                hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                style={styles.backBtn}
              >
                <Ionicons
                  name="chevron-back"
                  size={28}
                  color={theme.colors.text}
                />
              </Pressable>
              <TText
                variant="heading"
                style={[styles.headerTitle, { color: theme.colors.text }]}
              >
                Couldn't Identify
              </TText>
              <View style={{ width: 44 }} />
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
                We couldn't identify this food
              </TText>
              <TSpacer size="xs" />
              <TText
                style={[
                  styles.errorSubtitle,
                  { color: theme.colors.textMuted },
                ]}
              >
                Describe what you see and we'll look it up
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
                disabled={!description.trim()}
                style={({ pressed }) => [
                  styles.errorPrimaryBtn,
                  {
                    backgroundColor: theme.colors.primary,
                    opacity: !description.trim() ? 0.4 : pressed ? 0.9 : 1,
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
  headerWide: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
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
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontWeight: "500",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  scanHintContainer: {
    alignItems: "center",
    gap: 6,
  },
  scanHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  scanHintDivider: {
    width: 24,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  // ── Barcode highlight ──
  barcodeHighlight: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "#4ADE80",
    borderRadius: 8,
    zIndex: 20,
  },
  barcodeLabel: {
    position: "absolute",
    bottom: -28,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "center",
  },
  barcodeLabelText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
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
    justifyContent: "space-around",
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
