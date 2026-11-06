import type { ReactNode } from "react";
import Link from "next/link";
import { SignedInShell } from "./signed-in-shell";

export const dynamic = "force-dynamic";

const backendReady = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export default function AppLayout({ children }: { children: ReactNode }) {
  if (!backendReady) {
    return (
      <main className="page-container py-16">
        <h1 className="text-xl font-semibold tracking-tight">Sign-in is not set up yet</h1>
        <p className="mt-2 text-sm text-muted">Clerk and Convex keys are missing on this server, so lending and borrowing stay closed.</p>
        <Link href="/" className="mt-6 inline-flex text-sm font-medium text-accent">
          Back to the board
        </Link>
      </main>
    );
  }
  return <SignedInShell>{children}</SignedInShell>;
}
