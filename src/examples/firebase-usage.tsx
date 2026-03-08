/**
 * Infrastructure Integration Examples
 *
 * Shows how to use:
 *  - Analytics (PostHog via src/infrastructure/analytics)
 *  - Crashlytics (Firebase via src/lib/firebase)
 *
 * Analytics is vendor-agnostic — feature code never imports PostHog directly.
 * Crashlytics stays Firebase-native (no abstraction needed today).
 */

import { getAppConfig } from "@/src/config";
import { analytics } from "@/src/infrastructure/analytics";
import {
    didCrashOnPreviousExecution,
    initializeFirebase,
    isFirebaseReady,
    // Crashlytics
    recordError,
    setAttributes,
    setCrashUserId,
} from "@/src/lib/firebase";
import React from "react";
import { Button, Text, View } from "react-native";

// ============================================
// Example 1: Initialize Firebase on App Start
// ============================================
export function FirebaseInitExample() {
  React.useEffect(() => {
    // Initialize Firebase - safe to call even if disabled
    initializeFirebase().then((success) => {
      if (success) {
        console.log("✅ Firebase initialized successfully");
      } else {
        console.log("ℹ️ Firebase not initialized (disabled or missing config)");
      }
    });

    // Check if Firebase is ready
    if (isFirebaseReady()) {
      console.log("Firebase is ready to use");
    }
  }, []);

  return null; // This runs in your root layout
}

// ============================================
// Example 2: Track User Events
// ============================================
export function TrackEventExample() {
  const handleFoodScanned = (foodType: string, calories: number) => {
    // Track custom event via analytics singleton
    analytics.track("food_scanned", {
      food_type: foodType,
      calories: calories,
      meal_time: new Date().getHours() < 12 ? "breakfast" : "lunch",
    });

    console.log(`Tracked: ${foodType} scan`);
  };

  return (
    <Button title="Scan Food" onPress={() => handleFoodScanned("apple", 95)} />
  );
}

// ============================================
// Example 3: Track Screen Views
// ============================================
export function ScreenViewExample() {
  React.useEffect(() => {
    // Log screen view when component mounts
    analytics.screen("HomeScreen", { section: "Home" });
  }, []);

  return <Text>Home Screen</Text>;
}

// ============================================
// Example 4: Set User Context After Login
// ============================================
export function UserContextExample() {
  const handleLogin = async (userId: string, email: string) => {
    // Identify user for analytics segmentation
    analytics.identify(userId, {
      subscription_tier: "free",
      signup_date: new Date().toISOString().split("T")[0],
      preferred_language: "en",
    });

    // Track login event
    analytics.track("login", { method: "email" });

    // Set user ID for crash reports (still Firebase-native)
    await setCrashUserId(userId);

    // Set crash attributes
    await setAttributes({
      email: email,
      environment: "production",
      app_version: "1.0.0",
    });

    console.log("User context set");
  };

  return (
    <Button
      title="Login"
      onPress={() => handleLogin("user_123", "user@example.com")}
    />
  );
}

// ============================================
// Example 5: Record Non-Fatal Errors
// ============================================
export function ErrorHandlingExample() {
  const handleAPICall = async () => {
    try {
      const response = await fetch("https://api.example.com/data");

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      // Record non-fatal error to Crashlytics
      await recordError(error as Error, {
        endpoint: "/data",
        method: "GET",
        timestamp: new Date().toISOString(),
      });

      // Still handle the error locally
      console.error("API call failed:", error);
      return null;
    }
  };

  return <Button title="Make API Call" onPress={handleAPICall} />;
}

// ============================================
// Example 6: Error Boundary with Firebase
// ============================================
// Note: Install react-error-boundary: npm install react-error-boundary

export function ErrorBoundaryExample() {
  // Example using react-error-boundary (if installed)
  // Uncomment when you add the package

  /*
  import { ErrorBoundary } from 'react-error-boundary';
  
  function ErrorFallback({ error }: { error: Error }) {
    return (
      <View>
        <Text>Something went wrong</Text>
        <Text>{error.message}</Text>
      </View>
    );
  }
  
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error: Error, errorInfo: React.ErrorInfo) => {
        // Automatically record all React errors
        recordError(error, {
          componentStack: errorInfo.componentStack,
          errorBoundary: true,
        });
      }}
    >
      <YourApp />
    </ErrorBoundary>
  );
  */

  // Alternative: Use try-catch in event handlers
  const handleClick = async () => {
    try {
      throw new Error("Test error");
    } catch (error) {
      recordError(error as Error, { source: "button_click" });
    }
  };

  return <Button title="Test Error" onPress={handleClick} />;
}

// ============================================
// Example 7: Track E-Commerce Events
// ============================================
export function EcommerceExample() {
  const handlePurchase = () => {
    // Track purchase via analytics singleton
    analytics.track("purchase", {
      item_id: "premium_monthly",
      item_name: "Premium Subscription",
      item_category: "subscription",
      price: 9.99,
      currency: "USD",
      quantity: 1,
    });
  };

  return <Button title="Subscribe" onPress={handlePurchase} />;
}

// ============================================
// Example 8: Check Previous Crash
// ============================================
export function CrashCheckExample() {
  React.useEffect(() => {
    // Check if app crashed on previous launch
    didCrashOnPreviousExecution().then((didCrash) => {
      if (didCrash) {
        console.log("App crashed on previous launch");
        // Show apology message or feedback prompt
      }
    });
  }, []);

  return null;
}

// ============================================
// Example 9: Feature Flag Driven Analytics
// ============================================
export function FeatureFlagExample() {
  const config = getAppConfig();

  const handleButtonClick = () => {
    // analytics.track() is always safe to call — if the config profile
    // disables analytics, the singleton is a NoopAnalyticsClient.
    analytics.track("button_clicked", { button_id: "cta_primary" });

    // Your button logic
    console.log("Button clicked");
  };

  return (
    <View>
      <Button title="Click Me" onPress={handleButtonClick} />

      {/* Show infrastructure status */}
      <Text>
        Analytics: {config.features.analytics ? "Enabled" : "Disabled"}
      </Text>
      <Text>
        Crashlytics: {config.features.crashReporting ? "Enabled" : "Disabled"}
      </Text>
    </View>
  );
}

// ============================================
// Example 10: Complete App Setup
// ============================================
export function CompleteAppSetup() {
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    const initializeApp = async () => {
      // 1. Initialize Firebase (Crashlytics + Performance)
      const firebaseReady = await initializeFirebase();

      if (firebaseReady) {
        console.log("Firebase initialized");

        // 2. Check previous crash
        const crashed = await didCrashOnPreviousExecution();
        if (crashed) {
          analytics.track("app_recovered_from_crash");
        }
      }

      // 3. Analytics is initialized separately via initAnalytics()
      //    in CaloricProviders — no manual setup needed here.
      analytics.track("app_open", {
        platform: "ios",
        version: "1.0.0",
      });

      setIsReady(true);
    };

    initializeApp();
  }, []);

  if (!isReady) {
    return <Text>Loading...</Text>;
  }

  return <YourApp />;
}

// Dummy components for examples
const YourApp: any = () => null;
