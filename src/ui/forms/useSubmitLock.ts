/**
 * useSubmitLock
 * Hook to prevent double-submit on forms
 */

import { useCallback, useState } from "react";

export function useSubmitLock() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const withSubmitLock = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
      if (isSubmitting) {
        return undefined;
      }

      setIsSubmitting(true);
      try {
        return await fn();
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting]
  );

  return {
    isSubmitting,
    withSubmitLock,
  };
}
