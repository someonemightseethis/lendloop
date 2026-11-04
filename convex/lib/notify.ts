import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import type { NotificationEvent } from "./domain";

/** Who hears about each event: the person who has to react, or whose request changed. */
const RECIPIENT: Record<NotificationEvent, "ownerId" | "borrowerId"> = {
  "request.created": "ownerId",
  "request.cancelled": "ownerId",
  "request.approved": "borrowerId",
  "request.declined": "borrowerId",
  "loan.returned": "borrowerId",
  "listing.removed": "borrowerId",
};

/**
 * Transactional outbox: the notification row is written in the same mutation as
 * the status change, and delivery runs afterwards in an action with retries. A
 * failed webhook can never roll back or block the user's action.
 */
export async function enqueueNotification(ctx: MutationCtx, loan: Doc<"loans">, event: NotificationEvent): Promise<Id<"notifications">> {
  const notificationId = await ctx.db.insert("notifications", {
    loanId: loan._id,
    event,
    recipientId: loan[RECIPIENT[event]],
    status: "pending",
    attempts: 0,
  });
  await ctx.scheduler.runAfter(0, internal.automation.deliverNotification, { notificationId });
  return notificationId;
}
