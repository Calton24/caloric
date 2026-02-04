/**
 * Example: Using the configuration system
 */

import { getAppConfig } from "@/src/config";
import { getFeatureFlags, isFeatureEnabled } from "@/src/lib/remote-config";
import { callEdgeFunction, getSupabaseClient } from "@/src/lib/supabase";

// ============================================
// Example 1: Get Current App Config
// ============================================
export function ExampleGetConfig() {
  const config = getAppConfig();

  console.log("Current App:", config.app.name);
  console.log("Profile:", config.profile);
  console.log("Environment:", config.environment);
  console.log("Supabase URL:", config.supabase.url);
  console.log("Features:", config.features);

  return config;
}

// ============================================
// Example 2: Use Supabase Client
// ============================================
export async function ExampleSupabaseQuery() {
  const supabase = getSupabaseClient();

  // The client is automatically configured for the active profile!

  // Query data
  const { data: users, error } = await supabase
    .from("users")
    .select("*")
    .limit(10);

  if (error) {
    console.error("Query error:", error);
    return null;
  }

  console.log("Fetched users:", users);
  return users;
}

// ============================================
// Example 3: Authentication
// ============================================
export async function ExampleAuth() {
  const supabase = getSupabaseClient();

  // Sign up
  const { error: signUpError } = await supabase.auth.signUp({
    email: "user@example.com",
    password: "secure-password",
    options: {
      data: {
        name: "John Doe",
        avatar_url: "https://...",
      },
    },
  });

  if (signUpError) {
    console.error("Sign up error:", signUpError);
  }

  // Sign in
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: "user@example.com",
    password: "secure-password",
  });

  if (signInError) {
    console.error("Sign in error:", signInError);
  }

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  console.log("Current user:", user);

  // Sign out
  await supabase.auth.signOut();
}

// ============================================
// Example 4: Call Edge Function
// ============================================
export async function ExampleEdgeFunction() {
  // Simple call
  const { data, error } = await callEdgeFunction({
    name: "process-vision",
    body: {
      imageUrl: "https://example.com/image.jpg",
    },
  });

  if (error) {
    console.error("Edge function error:", error);
    return null;
  }

  console.log("Vision results:", data);
  return data;
}

// ============================================
// Example 5: Feature Flags (Static)
// ============================================
export function ExampleStaticFeatureFlags() {
  const config = getAppConfig();

  // Check if vision feature is enabled
  if (config.features.vision) {
    console.log("Vision AI is enabled for this app");
    // Show vision UI
  }

  // Check if paywall is enabled
  if (config.features.paywall) {
    console.log("Paywall is enabled");
    // Show subscription UI
  }

  // Conditionally render based on features
  return (
    <View>
      {config.features.vision && <VisionAIButton />}
      {config.features.water && <WaterTracker />}
      {config.features.habit && <HabitTracker />}
    </View>
  );
}

// ============================================
// Example 6: Feature Flags (Remote - Optional)
// ============================================
export async function ExampleRemoteFeatureFlags() {
  // Fetch remote feature flags from Supabase
  // These override static config and are cached for 5 minutes
  const features = await getFeatureFlags();

  console.log("Remote features:", features);

  // Check individual feature
  const visionEnabled = await isFeatureEnabled("vision");

  if (visionEnabled) {
    console.log("Vision is enabled via remote config");
  }

  return features;
}

// ============================================
// Example 7: Typed Edge Function Call
// ============================================
interface VisionResponse {
  labels: string[];
  confidence: number;
  categories: string[];
}

export async function ExampleTypedEdgeFunction() {
  const { data, error } = await callEdgeFunction<VisionResponse>({
    name: "analyze-food",
    body: {
      imageUrl: "https://example.com/food.jpg",
    },
  });

  if (error || !data) {
    console.error("Failed to analyze food:", error);
    return null;
  }

  // TypeScript knows the shape of data
  console.log("Food labels:", data.labels);
  console.log("Confidence:", data.confidence);

  return data;
}

// ============================================
// Example 8: Environment-Specific Logic
// ============================================
export function ExampleEnvironmentLogic() {
  const config = getAppConfig();

  // Different behavior per environment
  switch (config.environment) {
    case "dev":
      console.log("Running in development mode");
      console.log("Debug logging enabled");
      // Enable debug features
      break;

    case "staging":
      console.log("Running in staging mode");
      // Enable test mode
      break;

    case "prod":
      console.log("Running in production mode");
      // Disable debug, enable analytics
      break;
  }

  return config.environment;
}

// ============================================
// Example 9: Profile-Specific Logic
// ============================================
export function ExampleProfileLogic() {
  const config = getAppConfig();

  // Different UI per app profile
  switch (config.profile) {
    case "intake":
      return <IntakeHomePage />;

    case "proxi":
      return <ProxiHomePage />;

    default:
      return <DefaultHomePage />;
  }
}

// ============================================
// Example 10: Complete Feature Implementation
// ============================================
export function ExampleCompleteFeature() {
  const config = getAppConfig();
  const [features, setFeatures] = React.useState(config.features);

  React.useEffect(() => {
    // Load remote config on mount (optional)
    getFeatureFlags().then(setFeatures);
  }, []);

  const handleUploadImage = async (imageUri: string) => {
    // 1. Upload to Supabase Storage
    const supabase = getSupabaseClient();

    const fileName = `${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(fileName, imageUri);

    if (uploadError) {
      console.error("Upload failed:", uploadError);
      return;
    }

    // 2. Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("images").getPublicUrl(fileName);

    // 3. Call Edge Function to process with Vision AI
    const { data: visionData, error: visionError } =
      await callEdgeFunction<VisionResponse>({
        name: "process-vision",
        body: { imageUrl: publicUrl },
      });

    if (visionError) {
      console.error("Vision processing failed:", visionError);
      return;
    }

    // 4. Save results to database
    const { error: saveError } = await supabase.from("vision_results").insert({
      image_url: publicUrl,
      labels: visionData?.labels || [],
      confidence: visionData?.confidence || 0,
    });

    if (saveError) {
      console.error("Save failed:", saveError);
      return;
    }

    console.log("Image processed successfully!");
  };

  return (
    <View>
      <Text>{config.app.name}</Text>

      {features.vision && (
        <Button title="Upload Image" onPress={() => handleUploadImage("...")} />
      )}
    </View>
  );
}

// Dummy components for examples
const View: any = null;
const Text: any = null;
const Button: any = null;
const VisionAIButton: any = null;
const WaterTracker: any = null;
const HabitTracker: any = null;
const IntakeHomePage: any = null;
const ProxiHomePage: any = null;
const DefaultHomePage: any = null;
const React: any = null;
