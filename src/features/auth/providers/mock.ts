/**
 * Mock Auth Provider
 * For tests and offline development. No network calls.
 */

import type {
    AuthClient,
    AuthResponse,
    OAuthProvider,
    OAuthResponse,
    Session,
    User,
} from "../authClient";

export class MockAuthClient implements AuthClient {
  private currentSession: Session | null = null;
  private listeners: ((session: Session | null) => void)[] = [];

  async signIn(email: string, password: string): Promise<AuthResponse> {
    await delay(800);

    if (!email || !password) {
      return {
        user: null,
        session: null,
        error: new Error("Email and password are required"),
      };
    }

    if (password.length < 6) {
      return {
        user: null,
        session: null,
        error: new Error("Invalid credentials"),
      };
    }

    const user: User = {
      id: "mock-user-id",
      email,
      createdAt: new Date().toISOString(),
    };

    const session: Session = {
      user,
      accessToken: "mock-access-token",
      refreshToken: "mock-refresh-token",
    };

    this.currentSession = session;
    this.notifyListeners(session);
    return { user, session, error: null };
  }

  async signUp(email: string, password: string): Promise<AuthResponse> {
    await delay(800);

    if (!email || !password) {
      return {
        user: null,
        session: null,
        error: new Error("Email and password are required"),
      };
    }

    if (password.length < 6) {
      return {
        user: null,
        session: null,
        error: new Error("Password must be at least 6 characters"),
      };
    }

    if (!email.includes("@")) {
      return {
        user: null,
        session: null,
        error: new Error("Invalid email address"),
      };
    }

    const user: User = {
      id: "mock-user-id-" + Date.now(),
      email,
      createdAt: new Date().toISOString(),
    };

    const session: Session = {
      user,
      accessToken: "mock-access-token",
      refreshToken: "mock-refresh-token",
    };

    this.currentSession = session;
    this.notifyListeners(session);
    return { user, session, error: null };
  }

  async signOut(): Promise<{ error: Error | null }> {
    await delay(300);
    this.currentSession = null;
    this.notifyListeners(null);
    return { error: null };
  }

  async resetPasswordForEmail(email: string): Promise<{ error: Error | null }> {
    await delay(800);
    if (!email || !email.includes("@")) {
      return { error: new Error("Invalid email address") };
    }
    return { error: null };
  }

  async updatePassword(newPassword: string): Promise<{ error: Error | null }> {
    await delay(800);
    if (newPassword.length < 6) {
      return { error: new Error("Password must be at least 6 characters") };
    }
    return { error: null };
  }

  async exchangeCodeForSession(
    _code: string
  ): Promise<{ error: Error | null }> {
    await delay(300);
    // Mock: simulate successful code exchange
    return { error: null };
  }

  async signInWithOAuth(_provider: OAuthProvider): Promise<OAuthResponse> {
    await delay(500);
    // Mock returns a fake URL to simulate the OAuth flow
    return { url: "https://mock-oauth.example.com/authorize", error: null };
  }

  async getSession(): Promise<{
    session: Session | null;
    error: Error | null;
  }> {
    return { session: this.currentSession, error: null };
  }

  onAuthStateChange(callback: (session: Session | null) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notifyListeners(session: Session | null) {
    this.listeners.forEach((listener) => listener(session));
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
