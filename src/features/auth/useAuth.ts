/**
 * useAuth Hook
 * Access auth context
 */

import { useContext } from "react";
import { invariant } from "../../utils/invariant";
import { AuthContext, AuthContextValue } from "./AuthProvider";

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  invariant(
    context !== undefined,
    "useAuth must be used within an AuthProvider. Did you forget to wrap your app with <MobileCoreProviders>?"
  );
  return context!;
}
