import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import type { NotificationEvent } from "./domain";

export type ActivityItem =
  | { kind: "notification"; event: NotificationEvent; status: "pending" | "delivered" | "failed"; at: number }
  | { kind: "reminder"; status: "sent" | "failed"; at: number };

const RECENT = 5;

/** Recent automation activity for one loan, newest first ("Reminder sent 2 days ago"). */
export async function recentActivity(ctx: QueryCtx, loanId: Id<"loans">): Promise<ActivityItem[]> {
  const [notifications, reminders] = await Promise.all([
    ctx.db.query("notifications").withIndex("by_loan", (q) => q.eq("loanId", loanId)).order("desc").take(RECENT),
    ctx.db.query("reminders").withIndex("by_loan", (q) => q.eq("loanId", loanId)).order("desc").take(RECENT),
  ]);
  const items: ActivityItem[] = [
    ...notifications.map((n) => ({
      kind: "notification" as const,
      event: n.event,
      status: n.status,
      at: n.deliveredAt ?? n._creationTime,
    })),
    ...reminders.map((r) => ({ kind: "reminder" as const, status: r.status, at: r._creationTime })),
  ];
  return items.sort((a, b) => b.at - a.at).slice(0, RECENT);
}
