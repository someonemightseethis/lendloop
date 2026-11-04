import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { displayName, requireAdmin } from "./lib/auth";
import { isoDay } from "./lib/dates";
import { vLoanStatus } from "./lib/domain";
import { fail } from "./lib/errors";
import { retireTool } from "./lib/retire";

const LIMIT = 200;

/** Every loan across the board, optionally by status. Admin only. */
export const allLoans = query({
  args: { status: v.optional(vLoanStatus) },
  handler: async (ctx, { status }) => {
    await requireAdmin(ctx);
    const today = isoDay(Date.now());
    const loans = status
      ? await ctx.db.query("loans").withIndex("by_status_end", (q) => q.eq("status", status)).order("desc").take(LIMIT)
      : await ctx.db.query("loans").order("desc").take(LIMIT);
    return await Promise.all(
      loans.map(async (loan) => {
        const [tool, owner, borrower] = await Promise.all([
          ctx.db.get(loan.toolId),
          ctx.db.get(loan.ownerId),
          ctx.db.get(loan.borrowerId),
        ]);
        return {
          _id: loan._id,
          status: loan.status,
          startDate: loan.startDate,
          endDate: loan.endDate,
          overdue: loan.status === "approved" && loan.endDate < today,
          toolName: tool?.name ?? "Removed tool",
          ownerName: owner ? displayName(owner) : "Unknown",
          borrowerName: borrower ? displayName(borrower) : "Unknown",
        };
      }),
    );
  },
});

/** Members with their role and Trusted Lender badge. Admins see emails to contact members; nobody else does. */
export const users = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").order("desc").take(LIMIT);
    return users.map((u) => ({ _id: u._id, name: u.name, email: u.email, role: u.role, trustedLender: u.trustedLender }));
  },
});

export const setTrustedLender = mutation({
  args: { userId: v.id("users"), trusted: v.boolean() },
  handler: async (ctx, { userId, trusted }) => {
    await requireAdmin(ctx);
    if (!(await ctx.db.get(userId))) fail("NOT_FOUND", "That member doesn't exist.");
    await ctx.db.patch(userId, { trustedLender: trusted });
  },
});

/** Moderation: remove any listing, even one that is currently out on loan. */
export const removeListing = mutation({
  args: { toolId: v.id("tools") },
  handler: async (ctx, { toolId }) => {
    await requireAdmin(ctx);
    const tool = await ctx.db.get(toolId);
    if (!tool) fail("NOT_FOUND", "That listing doesn't exist.");
    await retireTool(ctx, tool, { today: isoDay(Date.now()), allowActiveLoan: true });
  },
});

/** Failed automation runs, newest first, so nothing fails silently. */
export const automationFailures = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("automationFailures").order("desc").take(LIMIT);
  },
});

export const resolveFailure = mutation({
  args: { failureId: v.id("automationFailures") },
  handler: async (ctx, { failureId }) => {
    await requireAdmin(ctx);
    if (!(await ctx.db.get(failureId))) fail("NOT_FOUND", "That failure doesn't exist.");
    await ctx.db.patch(failureId, { resolvedAt: Date.now() });
  },
});
