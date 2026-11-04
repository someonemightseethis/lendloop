import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

export type Availability = { status: "available" } | { status: "on_loan"; until: string; overdue: boolean };

export function approvedLoans(ctx: QueryCtx, toolId: Id<"tools">): Promise<Doc<"loans">[]> {
  return ctx.db
    .query("loans")
    .withIndex("by_tool_status", (q) => q.eq("toolId", toolId).eq("status", "approved"))
    .collect();
}

/** A tool is on loan from the start of an approved range until the owner marks it returned. */
export function availabilityFrom(approved: Doc<"loans">[], today: string): Availability {
  const active = approved.find((loan) => loan.startDate <= today);
  if (!active) return { status: "available" };
  return { status: "on_loan", until: active.endDate, overdue: active.endDate < today };
}

export async function availabilityOf(ctx: QueryCtx, toolId: Id<"tools">, today: string): Promise<Availability> {
  return availabilityFrom(await approvedLoans(ctx, toolId), today);
}
