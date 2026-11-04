import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { approvedLoans } from "./lib/availability";
import { assertValidRange, isoDay, rangesOverlap } from "./lib/dates";
import { fail } from "./lib/errors";
import { toLoanView } from "./lib/loanView";
import { enqueueNotification } from "./lib/notify";
import { actorFor, assertTransition } from "./lib/transitions";

async function loadLoan(ctx: MutationCtx, loanId: Id<"loans">): Promise<Doc<"loans">> {
  const loan = await ctx.db.get(loanId);
  if (!loan) fail("NOT_FOUND", "That request doesn't exist.");
  return loan;
}

async function assertNoApprovedOverlap(ctx: MutationCtx, range: Doc<"loans"> | { toolId: Id<"tools">; startDate: string; endDate: string }) {
  const clash = (await approvedLoans(ctx, range.toolId)).find((loan) => rangesOverlap(loan, range));
  if (clash) fail("CONFLICT", `The tool is already booked ${clash.startDate} to ${clash.endDate}.`);
}

/** Borrower asks for a tool for an inclusive date range. */
export const request = mutation({
  args: { toolId: v.id("tools"), startDate: v.string(), endDate: v.string() },
  handler: async (ctx, { toolId, startDate, endDate }) => {
    const borrower = await requireUser(ctx);
    const tool = await ctx.db.get(toolId);
    if (!tool || tool.removedAt !== undefined) fail("NOT_FOUND", "That listing doesn't exist.");
    if (tool.ownerId === borrower._id) fail("FORBIDDEN", "You can't borrow your own tool.");
    assertValidRange(startDate, endDate, isoDay(Date.now()));
    await assertNoApprovedOverlap(ctx, { toolId, startDate, endDate });

    const pending = await ctx.db
      .query("loans")
      .withIndex("by_tool_status", (q) => q.eq("toolId", toolId).eq("status", "requested"))
      .collect();
    if (pending.some((loan) => loan.borrowerId === borrower._id)) {
      fail("CONFLICT", "You already have a pending request for this tool.");
    }

    const loanId = await ctx.db.insert("loans", {
      toolId,
      ownerId: tool.ownerId,
      borrowerId: borrower._id,
      startDate,
      endDate,
      status: "requested",
    });
    await enqueueNotification(ctx, (await ctx.db.get(loanId))!, "request.created");
    return loanId;
  },
});

/** Owner approves. Overlapping pending requests are declined automatically so they can't be approved later. */
export const approve = mutation({
  args: { loanId: v.id("loans") },
  handler: async (ctx, { loanId }) => {
    const user = await requireUser(ctx);
    const loan = await loadLoan(ctx, loanId);
    assertTransition(loan, "approved", actorFor(loan, user));
    if (loan.startDate < isoDay(Date.now())) fail("CONFLICT", "This request's start date has passed. Decline it instead.");
    await assertNoApprovedOverlap(ctx, loan);

    const now = Date.now();
    await ctx.db.patch(loan._id, { status: "approved", decidedAt: now });
    await enqueueNotification(ctx, loan, "request.approved");

    const competing = await ctx.db
      .query("loans")
      .withIndex("by_tool_status", (q) => q.eq("toolId", loan.toolId).eq("status", "requested"))
      .collect();
    for (const other of competing.filter((o) => o._id !== loan._id && rangesOverlap(o, loan))) {
      assertTransition(other, "declined", "system");
      await ctx.db.patch(other._id, { status: "declined", decidedAt: now });
      await enqueueNotification(ctx, other, "request.declined");
    }
  },
});

export const decline = mutation({
  args: { loanId: v.id("loans") },
  handler: async (ctx, { loanId }) => {
    const user = await requireUser(ctx);
    const loan = await loadLoan(ctx, loanId);
    assertTransition(loan, "declined", actorFor(loan, user));
    await ctx.db.patch(loan._id, { status: "declined", decidedAt: Date.now() });
    await enqueueNotification(ctx, loan, "request.declined");
  },
});

/** Borrower withdraws a pending request, or an approved booking that hasn't started yet. */
export const cancel = mutation({
  args: { loanId: v.id("loans") },
  handler: async (ctx, { loanId }) => {
    const user = await requireUser(ctx);
    const loan = await loadLoan(ctx, loanId);
    assertTransition(loan, "cancelled", actorFor(loan, user));
    if (loan.status === "approved" && loan.startDate <= isoDay(Date.now())) {
      fail("CONFLICT", "This loan has started. Return the tool and ask the owner to mark it returned.");
    }
    await ctx.db.patch(loan._id, { status: "cancelled", decidedAt: Date.now() });
    await enqueueNotification(ctx, loan, "request.cancelled");
  },
});

/** Owner confirms the tool came back. Only the owner can, so a borrower can't close a loan unilaterally. */
export const markReturned = mutation({
  args: { loanId: v.id("loans") },
  handler: async (ctx, { loanId }) => {
    const user = await requireUser(ctx);
    const loan = await loadLoan(ctx, loanId);
    assertTransition(loan, "returned", actorFor(loan, user));
    if (loan.startDate > isoDay(Date.now())) fail("CONFLICT", "This loan hasn't started yet.");
    await ctx.db.patch(loan._id, { status: "returned", returnedAt: Date.now() });
    await enqueueNotification(ctx, loan, "loan.returned");
  },
});

/** "My requests": everything the caller asked to borrow, newest first. */
export const myRequests = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const today = isoDay(Date.now());
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_borrower", (q) => q.eq("borrowerId", user._id))
      .order("desc")
      .collect();
    return await Promise.all(loans.map((loan) => toLoanView(ctx, loan, loan.ownerId, today)));
  },
});

/** "Incoming requests": requests and loans on the caller's tools, newest first. */
export const incoming = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const today = isoDay(Date.now());
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .order("desc")
      .collect();
    return await Promise.all(loans.map((loan) => toLoanView(ctx, loan, loan.borrowerId, today)));
  },
});
