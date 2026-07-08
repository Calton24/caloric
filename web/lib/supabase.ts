import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { FitnessGoalValue } from "@/lib/constants";

export type AndroidWaitlistRow = {
  id: string;
  name: string;
  email: string;
  fitness_goal: FitnessGoalValue | null;
  created_at: string;
};

export type AndroidWaitlistInsert = {
  id?: string;
  name: string;
  email: string;
  fitness_goal?: FitnessGoalValue | null;
  created_at?: string;
};

type Database = {
  public: {
    Tables: {
      android_waitlist: {
        Row: AndroidWaitlistRow;
        Insert: AndroidWaitlistInsert;
        Update: Partial<AndroidWaitlistInsert>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function getSupabaseConfigError(): string | null {
  if (isSupabaseConfigured()) return null;
  return "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY";
}

let client: SupabaseClient<Database> | null = null;

export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  if (client) return client;

  const configError = getSupabaseConfigError();
  if (configError) {
    throw new Error(configError);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  client = createClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return client;
}
