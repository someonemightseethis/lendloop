"use client";

import { useMutation } from "convex/react";
import type { FunctionReference } from "convex/server";
import { useCallback, useState } from "react";
import { errorMessage } from "./format";

/** Wraps a Convex mutation with pending and error state for buttons and forms. */
export function useSafeMutation<M extends FunctionReference<"mutation">>(mutation: M) {
  const run = useMutation(mutation);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const call = useCallback(
    async (args: M["_args"]): Promise<boolean> => {
      setPending(true);
      setError(null);
      try {
        await run(args);
        return true;
      } catch (cause) {
        setError(errorMessage(cause));
        return false;
      } finally {
        setPending(false);
      }
    },
    [run],
  );

  return { call, pending, error, clearError: () => setError(null) };
}
