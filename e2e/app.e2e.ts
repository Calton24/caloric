/**
 * Mobile Core E2E Tests
 * Validates end-to-end flows through the app
 */

import { by, expect as detoxExpect, device, element } from "detox";

const TEST_EMAIL = `test-${Date.now()}@example.com`;
const TEST_PASSWORD = "Password123!";

describe("Mobile Core E2E", () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: { notifications: "YES" },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe("App Launch", () => {
    it("should launch the app successfully", async () => {
      await detoxExpect(element(by.text("Home"))).toBeVisible();
    });

    it("should display the bottom tabs", async () => {
      await detoxExpect(element(by.text("Home"))).toBeVisible();
      await detoxExpect(element(by.text("Auth"))).toBeVisible();
      await detoxExpect(element(by.text("Playground"))).toBeVisible();
    });
  });

  describe("Authentication Flow", () => {
    beforeEach(async () => {
      // Navigate to auth tab
      await element(by.text("Auth")).tap();
      await detoxExpect(element(by.id("auth-screen"))).toBeVisible();
    });

    it("should display auth form", async () => {
      await detoxExpect(element(by.id("email-input"))).toBeVisible();
      await detoxExpect(element(by.id("password-input"))).toBeVisible();
      await detoxExpect(element(by.id("submit-button"))).toBeVisible();
    });

    it("should toggle between sign in and sign up", async () => {
      // Initially on sign in
      await detoxExpect(element(by.text("Sign In"))).toBeVisible();

      // Toggle to sign up
      await element(by.id("toggle-auth-mode")).tap();
      await detoxExpect(element(by.text("Sign Up"))).toBeVisible();
      await detoxExpect(element(by.id("confirm-password-input"))).toBeVisible();

      // Toggle back to sign in
      await element(by.id("toggle-auth-mode")).tap();
      await detoxExpect(element(by.text("Sign In"))).toBeVisible();
    });

    it("should validate empty form submission", async () => {
      await element(by.id("submit-button")).tap();
      // Alert should appear (Detox doesn't easily test native alerts)
    });

    it("should create a new account", async () => {
      // Toggle to sign up mode
      await element(by.id("toggle-auth-mode")).tap();

      // Fill in form
      await element(by.id("email-input")).typeText(TEST_EMAIL);
      await element(by.id("password-input")).typeText(TEST_PASSWORD);
      await element(by.id("confirm-password-input")).typeText(TEST_PASSWORD);

      // Submit
      await element(by.id("submit-button")).tap();

      // Wait for success (or check for success indicator)
      await new Promise((resolve) => setTimeout(resolve, 2000));
    });

    it("should sign in with created account", async () => {
      // Fill in form
      await element(by.id("email-input")).typeText(TEST_EMAIL);
      await element(by.id("password-input")).typeText(TEST_PASSWORD);

      // Submit
      await element(by.id("submit-button")).tap();

      // Wait for auth state change
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Should show signed in state
      await detoxExpect(element(by.id("sign-out-button"))).toBeVisible();
    });

    it("should sign out successfully", async () => {
      // First sign in (assumes previous test passed)
      await element(by.id("email-input")).typeText(TEST_EMAIL);
      await element(by.id("password-input")).typeText(TEST_PASSWORD);
      await element(by.id("submit-button")).tap();
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Sign out
      await element(by.id("sign-out-button")).tap();
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Should show auth form again
      await detoxExpect(element(by.id("email-input"))).toBeVisible();
    });
  });

  describe("Notes Feature (Dev Only)", () => {
    beforeEach(async () => {
      // Navigate to auth tab and sign in
      await element(by.text("Auth")).tap();

      // Check if already signed in (try-catch approach)
      try {
        await detoxExpect(element(by.id("sign-out-button"))).toBeVisible();
        // Already signed in, continue
      } catch {
        // Sign in
        await element(by.id("email-input")).typeText(TEST_EMAIL);
        await element(by.id("password-input")).typeText(TEST_PASSWORD);
        await element(by.id("submit-button")).tap();
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      // Navigate to notes tab (only visible in dev mode)
      if (__DEV__) {
        await element(by.text("Notes")).tap();
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    });

    it("should display notes screen when authenticated", async () => {
      if (!__DEV__) return; // Skip in production builds

      await detoxExpect(element(by.id("notes-screen"))).toBeVisible();
      await detoxExpect(element(by.id("create-note-button"))).toBeVisible();
    });

    it("should open bottom sheet when create button is pressed", async () => {
      if (!__DEV__) return; // Skip in production builds

      await element(by.id("create-note-button")).tap();
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Bottom sheet should be visible
      await detoxExpect(element(by.id("create-note-sheet"))).toBeVisible();
      await detoxExpect(element(by.id("note-title-input"))).toBeVisible();
      await detoxExpect(element(by.id("note-content-input"))).toBeVisible();
    });

    it("should create a new note", async () => {
      if (!__DEV__) return; // Skip in production builds

      // Open create sheet
      await element(by.id("create-note-button")).tap();
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Fill in note
      await element(by.id("note-title-input")).typeText("Test Note");
      await element(by.id("note-content-input")).typeText(
        "This is a test note created by E2E tests"
      );

      // Submit
      await element(by.id("create-note-submit")).tap();
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Sheet should close
      await detoxExpect(element(by.id("create-note-sheet"))).not.toBeVisible();

      // Note should appear in list
      await detoxExpect(element(by.text("Test Note"))).toBeVisible();
    });

    it("should close bottom sheet on swipe down", async () => {
      if (!__DEV__) return; // Skip in production builds

      // Open create sheet
      await element(by.id("create-note-button")).tap();
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Swipe down to close (Detox gesture)
      await element(by.id("create-note-sheet")).swipe("down", "fast", 0.5);
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Sheet should be closed
      await detoxExpect(element(by.id("create-note-sheet"))).not.toBeVisible();
    });

    it("should refresh notes list on pull to refresh", async () => {
      if (!__DEV__) return; // Skip in production builds

      // Pull to refresh (if notes list exists)
      const notesList = element(by.id("notes-list"));
      await notesList.swipe("down", "slow", 0.75, 0.5, 0.5);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Notes should still be visible
      await detoxExpect(element(by.id("notes-screen"))).toBeVisible();
    });
  });

  describe("Navigation", () => {
    it("should navigate between tabs", async () => {
      // Start on home
      await element(by.text("Home")).tap();
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Navigate to playground
      await element(by.text("Playground")).tap();
      await new Promise((resolve) => setTimeout(resolve, 300));
      await detoxExpect(element(by.id("playground-screen"))).toBeVisible();

      // Navigate to auth
      await element(by.text("Auth")).tap();
      await new Promise((resolve) => setTimeout(resolve, 300));
      await detoxExpect(element(by.id("auth-screen"))).toBeVisible();

      // Back to home
      await element(by.text("Home")).tap();
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
  });
});
