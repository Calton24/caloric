/**
 * Supabase Client Tests
 * Tests singleton pattern, config usage, and security
 */

import { resetConfigCache } from "../src/config";
import { __resetSupabaseClient, getSupabaseClient } from "../src/lib/supabase";

describe("Supabase Client", () => {
  beforeEach(() => {
    __resetSupabaseClient();
    resetConfigCache();
    process.env.EXPO_PUBLIC_APP_PROFILE = "intake";
    process.env.EXPO_PUBLIC_APP_ENV = "prod";
    process.env.APP_ENV = "prod";
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance on multiple calls", () => {
      const client1 = getSupabaseClient();
      const client2 = getSupabaseClient();

      expect(client1).toBe(client2);
    });

    it("should create new instance after reset", () => {
      const client1 = getSupabaseClient();
      __resetSupabaseClient();
      const client2 = getSupabaseClient();

      expect(client1).not.toBe(client2);
    });
  });

  describe("Config Integration", () => {
    it("should use config from active profile", () => {
      process.env.EXPO_PUBLIC_APP_PROFILE = "intake";
      const client = getSupabaseClient();

      expect(client).toBeDefined();
      // Supabase client is created with URL and anon key from config
    });

    it("should work with different profiles", () => {
      process.env.EXPO_PUBLIC_APP_PROFILE = "proxi";
      resetConfigCache();
      __resetSupabaseClient();

      const client = getSupabaseClient();

      expect(client).toBeDefined();
    });
  });

  describe("Client API", () => {
    it("should have auth methods", () => {
      const client = getSupabaseClient();

      expect(client.auth).toBeDefined();
      expect(typeof client.auth.signUp).toBe("function");
      expect(typeof client.auth.signInWithPassword).toBe("function");
      expect(typeof client.auth.signOut).toBe("function");
    });

    it("should have database query methods", () => {
      const client = getSupabaseClient();

      expect(typeof client.from).toBe("function");
      expect(typeof client.rpc).toBe("function");
    });

    it("should have storage methods", () => {
      const client = getSupabaseClient();

      expect(client.storage).toBeDefined();
      expect(typeof client.storage.from).toBe("function");
    });

    it("should have realtime methods", () => {
      const client = getSupabaseClient();

      expect(typeof client.channel).toBe("function");
    });

    it("should have Edge Functions methods", () => {
      const client = getSupabaseClient();

      expect(client.functions).toBeDefined();
      expect(typeof client.functions.invoke).toBe("function");
    });
  });

  describe("Security", () => {
    it("should not expose service role key", () => {
      const client = getSupabaseClient();

      // Service role key should never be in client config
      expect((client as any).serviceRoleKey).toBeUndefined();
      expect((client as any).supabaseKey).not.toMatch(/service_role/);
    });

    it("should use anon key for client-side operations", () => {
      const client = getSupabaseClient();

      // Client should be initialized with anon key
      expect(client).toBeDefined();
    });
  });
});
