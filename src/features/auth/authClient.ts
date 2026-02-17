/**
 * Auth Client Interface
 * Mock auth client compatible with Supabase API
 */

export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface Session {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User | null;
  session: Session | null;
  error: Error | null;
}

export interface AuthClient {
  signIn(email: string, password: string): Promise<AuthResponse>;
  signUp(email: string, password: string): Promise<AuthResponse>;
  signOut(): Promise<{ error: Error | null }>;
  resetPasswordForEmail(email: string): Promise<{ error: Error | null }>;
  updatePassword(newPassword: string): Promise<{ error: Error | null }>;
  getSession(): Promise<{ session: Session | null; error: Error | null }>;
  onAuthStateChange(callback: (session: Session | null) => void): () => void;
}

/**
 * Mock Auth Client Implementation
 * In production, replace with actual Supabase client
 */
class MockAuthClient implements AuthClient {
  private currentSession: Session | null = null;
  private listeners: ((session: Session | null) => void)[] = [];

  async signIn(email: string, password: string): Promise<AuthResponse> {
    // Simulate API delay
    await this.delay(800);

    // Mock validation
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
    await this.delay(800);

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
    await this.delay(300);
    this.currentSession = null;
    this.notifyListeners(null);
    return { error: null };
  }

  async resetPasswordForEmail(email: string): Promise<{ error: Error | null }> {
    await this.delay(800);

    if (!email || !email.includes("@")) {
      return { error: new Error("Invalid email address") };
    }

    // Mock success
    return { error: null };
  }

  async updatePassword(newPassword: string): Promise<{ error: Error | null }> {
    await this.delay(800);

    if (newPassword.length < 6) {
      return { error: new Error("Password must be at least 6 characters") };
    }

    return { error: null };
  }

  async getSession(): Promise<{
    session: Session | null;
    error: Error | null;
  }> {
    return { session: this.currentSession, error: null };
  }

  onAuthStateChange(callback: (session: Session | null) => void): () => void {
    this.listeners.push(callback);
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notifyListeners(session: Session | null) {
    this.listeners.forEach((listener) => listener(session));
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const authClient: AuthClient = new MockAuthClient();
