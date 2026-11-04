import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { fail } from "./errors";

/**
 * Every authorization decision starts from the verified Clerk identity on the
 * request, resolved to our own user record. Role checks read the role stored in
 * Convex, never anything the client sends.
 */
export async function getViewer(ctx: QueryCtx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
}

export async function requireUser(ctx: QueryCtx): Promise<Doc<"users">> {
  const user = await getViewer(ctx);
  if (!user) fail("UNAUTHENTICATED", "Sign in to continue.");
  return user;
}

export async function requireAdmin(ctx: QueryCtx): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (user.role !== "admin") fail("FORBIDDEN", "Only admins can do that.");
  return user;
}

export function assertToolOwner(tool: Doc<"tools">, user: Doc<"users">): void {
  if (tool.ownerId !== user._id) fail("FORBIDDEN", "You can only change your own listings.");
}

/** Public-facing name: first name plus last initial. Emails never leave the server except to their owner and n8n. */
export function displayName(user: Pick<Doc<"users">, "name">): string {
  const [first, ...rest] = user.name.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0]}.` : first || "Neighbor";
}

export function firstName(user: Pick<Doc<"users">, "name">): string {
  return user.name.trim().split(/\s+/)[0] || "neighbor";
}
