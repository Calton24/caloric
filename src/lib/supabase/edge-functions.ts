/**
 * Edge Functions Helper
 * Type-safe wrapper for calling Supabase Edge Functions
 */

import { getAppConfig } from "../../config";
import { getSupabaseClient } from "./client";

export interface EdgeFunctionOptions {
  /** Function name */
  name: string;
  /** Request body */
  body?: Record<string, any>;
  /** HTTP method (default: POST) */
  method?: "GET" | "POST" | "PUT" | "DELETE";
  /** Additional headers */
  headers?: Record<string, string>;
}

export interface EdgeFunctionResponse<T = any> {
  data: T | null;
  error: Error | null;
}

/**
 * Call a Supabase Edge Function with automatic auth header injection
 *
 * Example:
 * ```ts
 * const { data, error } = await callEdgeFunction<{ message: string }>({
 *   name: 'process-vision',
 *   body: { imageUrl: 'https://...' }
 * });
 * ```
 */
export async function callEdgeFunction<T = any>(
  options: EdgeFunctionOptions,
): Promise<EdgeFunctionResponse<T>> {
  try {
    const client = getSupabaseClient();
    const config = getAppConfig();

    console.log(`📡 Calling Edge Function: ${options.name}`);

    // Get the functions URL (use custom or default)
    const functionsUrl =
      config.supabase.functionsUrl || `${config.supabase.url}/functions/v1`;

    // Get current session for auth
    const {
      data: { session },
    } = await client.auth.getSession();

    // Build headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    // Add auth header if user is logged in
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }

    // Make request
    const response = await fetch(`${functionsUrl}/${options.name}`, {
      method: options.method || "POST",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    // Parse response
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Edge Function error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    console.log(`✅ Edge Function ${options.name} completed`);

    return { data, error: null };
  } catch (error) {
    console.error(`❌ Edge Function ${options.name} failed:`, error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error("Unknown error"),
    };
  }
}

/**
 * Helper for calling Edge Functions that require authentication
 * Throws error if user is not authenticated
 */
export async function callAuthenticatedEdgeFunction<T = any>(
  options: EdgeFunctionOptions,
): Promise<EdgeFunctionResponse<T>> {
  const client = getSupabaseClient();
  const {
    data: { session },
  } = await client.auth.getSession();

  if (!session) {
    return {
      data: null,
      error: new Error("Authentication required to call this function"),
    };
  }

  return callEdgeFunction<T>(options);
}

/**
 * Typed Edge Function caller with generic response type
 * For better TypeScript support
 *
 * Example:
 * ```ts
 * interface VisionResponse { labels: string[]; confidence: number; }
 * const result = await callTypedEdgeFunction<VisionResponse>('process-vision', {
 *   imageUrl: 'https://...'
 * });
 * ```
 */
export async function callTypedEdgeFunction<TResponse = any, TBody = any>(
  functionName: string,
  body?: TBody,
  authenticated = false,
): Promise<EdgeFunctionResponse<TResponse>> {
  const caller = authenticated
    ? callAuthenticatedEdgeFunction
    : callEdgeFunction;

  return caller<TResponse>({
    name: functionName,
    body: body as Record<string, any>,
  });
}
