import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import type { LoanStatus } from "./domain";
import { fail } from "./errors";
import { enqueueNotification } from "./notify";
import { assertTransition } from "./transitions";

function loansWithStatus(ctx: MutationCtx, tool: Doc<"tools">, status: LoanStatus) {
  return ctx.db
    .query("loans")
    .withIndex("by_tool_status", (q) => q.eq("toolId", tool._id).eq("status", status))
    .collect();
}

/**
 * Soft-removes a listing. Pending requests are declined and future bookings
 * cancelled, and each affected borrower is notified. A loan that has already
 * started stays so it can still be returned: owners must wait for it, admins
 * (moderation) may remove the listing anyway.
 */
export async function retireTool(
  ctx: MutationCtx,
  tool: Doc<"tools">,
  { today, allowActiveLoan }: { today: string; allowActiveLoan: boolean },
): Promise<void> {
  if (tool.removedAt !== undefined) fail("NOT_FOUND", "This listing was already removed.");

  const pending = await loansWithStatus(ctx, tool, "requested");
  const approved = await loansWithStatus(ctx, tool, "approved");
  const future = approved.filter((loan) => loan.startDate > today);
  if (future.length < approved.length && !allowActiveLoan) {
    fail("CONFLICT", "This tool is out on loan. Mark it returned before removing the listing.");
  }

  const now = Date.now();
  const closures = [
    ...pending.map((loan) => ({ loan, to: "declined" as const })),
    ...future.map((loan) => ({ loan, to: "cancelled" as const })),
  ];
  for (const { loan, to } of closures) {
    assertTransition(loan, to, "system");
    await ctx.db.patch(loan._id, { status: to, decidedAt: now });
    await enqueueNotification(ctx, loan, "listing.removed");
  }
  await ctx.db.patch(tool._id, { removedAt: now });
}
