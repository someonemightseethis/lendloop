"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import { errorMessage } from "@/lib/format";

/** Syncs the Clerk identity into Convex once per session, then exposes the viewer's profile. */
export function useStoreUser() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const store = useMutation(api.users.store);
  const [stored, setStored] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const me = useQuery(api.users.me, stored ? {} : "skip");

  useEffect(() => {
    if (!isAuthenticated) return;
    store()
      .then(() => setStored(true))
      .catch((cause) => setError(errorMessage(cause)));
  }, [isAuthenticated, store]);

  return { me, error, authLoading: isLoading, isAuthenticated };
}
