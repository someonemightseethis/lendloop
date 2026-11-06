"use client";

import type { ReactNode } from "react";
import { AppNav } from "@/components/AppNav";
import { ErrorNote, LoadingRows } from "@/components/ui/States";
import { useStoreUser } from "@/components/useStoreUser";

/** Signed-in shell. Pages render once the viewer exists in Convex, so their queries never race the first sign-in. */
export function SignedInShell({ children }: { children: ReactNode }) {
  const { me, error, authLoading, isAuthenticated } = useStoreUser();

  let content: ReactNode = children;
  if (error) content = <ErrorNote message={error} />;
  else if (!authLoading && !isAuthenticated)
    content = <ErrorNote message="We couldn't verify your session with the backend. Check the Clerk and Convex setup in the README." />;
  else if (!me) content = <LoadingRows />;

  return (
    <>
      <AppNav isAdmin={me?.role === "admin"} trusted={me?.trustedLender ?? false} />
      <main className="page-container py-8">{content}</main>
    </>
  );
}
