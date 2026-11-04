import { mutation, query } from "./_generated/server";
import { getViewer } from "./lib/auth";
import type { Role } from "./lib/domain";
import { fail } from "./lib/errors";

/** Admins are bootstrapped from the ADMIN_EMAILS deployment variable, and only for verified emails. */
function roleFor(email: string, emailVerified: boolean | undefined): Role {
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return emailVerified === true && admins.includes(email) ? "admin" : "user";
}

/** Called by the client after sign-in: creates or refreshes the user record from the verified identity. */
export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) fail("UNAUTHENTICATED", "Sign in to continue.");

    const email = identity.email?.toLowerCase();
    if (!email) fail("INVALID", "Your sign-in token has no email claim. Enable Clerk's Convex integration (see README).");
    const name = (identity.name ?? identity.givenName ?? email.split("@")[0]) || "Neighbor";
    const role = roleFor(email, identity.emailVerified);

    const existing = await getViewer(ctx);
    if (!existing) {
      return await ctx.db.insert("users", {
        tokenIdentifier: identity.tokenIdentifier,
        name,
        email,
        role,
        trustedLender: false,
      });
    }
    if (existing.name !== name || existing.email !== email || existing.role !== role) {
      await ctx.db.patch(existing._id, { name, email, role });
    }
    return existing._id;
  },
});

/** The signed-in user's own profile. */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const user = await getViewer(ctx);
    if (!user) return null;
    return { _id: user._id, name: user.name, email: user.email, role: user.role, trustedLender: user.trustedLender };
  },
});
