import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { recentActivity } from "./activity";
import { displayName } from "./auth";

/** Shapes a loan for the UI, exposing only the other party's display name and trust badge. */
export async function toLoanView(ctx: QueryCtx, loan: Doc<"loans">, counterpartId: Doc<"users">["_id"], today: string) {
  const [tool, counterpart, activity] = await Promise.all([
    ctx.db.get(loan.toolId),
    ctx.db.get(counterpartId),
    recentActivity(ctx, loan._id),
  ]);
  return {
    _id: loan._id,
    status: loan.status,
    startDate: loan.startDate,
    endDate: loan.endDate,
    requestedAt: loan._creationTime,
    overdue: loan.status === "approved" && loan.endDate < today,
    started: loan.startDate <= today,
    tool: { name: tool?.name ?? "Removed tool", category: tool?.category ?? "other", removed: tool?.removedAt !== undefined },
    counterpart: {
      name: counterpart ? displayName(counterpart) : "Neighbor",
      trustedLender: counterpart?.trustedLender ?? false,
    },
    activity,
  };
}

export type LoanView = Awaited<ReturnType<typeof toLoanView>>;
