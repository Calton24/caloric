/**
 * Supabase Module - Public API
 */

export {
    __resetSupabaseClient, createSupabaseClient,
    getCurrentSession,
    getCurrentUser,
    getSupabaseClient,
    isAuthenticated,
    resetSupabaseClient
} from "./client";

export type { AuthError, Session, SupabaseClient, User } from "./client";

export {
    callAuthenticatedEdgeFunction,
    callEdgeFunction,
    callTypedEdgeFunction
} from "./edge-functions";

export type {
    EdgeFunctionOptions,
    EdgeFunctionResponse
} from "./edge-functions";

