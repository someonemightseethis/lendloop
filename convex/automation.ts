import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { firstName } from "./lib/auth";
import { daysBetween, isValidIsoDay } from "./lib/dates";
import { signRequest } from "./lib/signature";

/** Outbound retry policy: 5 attempts, backoff 30s, 1m, 2m, 4m. */
export const MAX_DELIVERY_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 30_000;
const DELIVERY_TIMEOUT_MS = 10_000;
const OVERDUE_BATCH = 100;

export const reminderKey = (loanId: string, day: string) => `${loanId}:${day}`;

/** Minimal webhook payload: only what n8n needs to write one message to one person. */
export const notificationPayload = internalQuery({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, { notificationId }) => {
    const notification = await ctx.db.get(notificationId);
    if (!notification || notification.status !== "pending") return null;
    const loan = await ctx.db.get(notification.loanId);
    const recipient = await ctx.db.get(notification.recipientId);
    if (!loan || !recipient) return null;
    const tool = await ctx.db.get(loan.toolId);
    return {
      attempts: notification.attempts,
      payload: {
        eventId: notification._id,
        event: notification.event,
        toolName: tool?.name ?? "a tool",
        startDate: loan.startDate,
        endDate: loan.endDate,
        recipient: { email: recipient.email, firstName: firstName(recipient) },
      },
    };
  },
});

export const recordDelivery = internalMutation({
  args: {
    notificationId: v.id("notifications"),
    ok: v.boolean(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { notificationId, ok, error }) => {
    const notification = await ctx.db.get(notificationId);
    if (!notification || notification.status !== "pending") return;
    const attempts = notification.attempts + 1;

    if (ok) {
      await ctx.db.patch(notificationId, { status: "delivered", attempts, deliveredAt: Date.now(), lastError: undefined });
      return;
    }
    if (attempts < MAX_DELIVERY_ATTEMPTS) {
      await ctx.db.patch(notificationId, { attempts, lastError: error });
      await ctx.scheduler.runAfter(BASE_BACKOFF_MS * 2 ** (attempts - 1), internal.automation.deliverNotification, {
        notificationId,
      });
      return;
    }
    await ctx.db.patch(notificationId, { status: "failed", attempts, lastError: error });
    await ctx.db.insert("automationFailures", {
      source: "convex",
      key: notificationId,
      workflow: "request-notification",
      node: "Convex webhook delivery",
      message: `Gave up after ${attempts} attempts: ${error ?? "unknown error"}`,
    });
  },
});

/** Signs the payload and POSTs it to the n8n webhook. Any failure is recorded and retried with backoff. */
export const deliverNotification = internalAction({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, { notificationId }) => {
    const job = await ctx.runQuery(internal.automation.notificationPayload, { notificationId });
    if (!job) return;

    const url = process.env.N8N_WEBHOOK_URL;
    const secret = process.env.CONVEX_TO_N8N_SECRET;
    let error: string | undefined;
    if (!url || !secret) {
      error = "N8N_WEBHOOK_URL or CONVEX_TO_N8N_SECRET is not set";
    } else {
      const body = JSON.stringify(job.payload);
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(await signRequest(secret, body)) },
          body,
          signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
        });
        if (!response.ok) error = `n8n responded ${response.status}`;
      } catch (cause) {
        error = cause instanceof Error ? cause.message : String(cause);
      }
    }
    await ctx.runMutation(internal.automation.recordDelivery, { notificationId, ok: !error, error });
  },
});

/** Approved loans past their end date that have not had a reminder sent today. */
export const overdueLoans = internalQuery({
  args: { today: v.string() },
  handler: async (ctx, { today }) => {
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_status_end", (q) => q.eq("status", "approved").lt("endDate", today))
      .take(OVERDUE_BATCH);

    const due = [];
    for (const loan of loans) {
      const key = reminderKey(loan._id, today);
      const sent = await ctx.db
        .query("reminders")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique();
      if (sent?.status === "sent") continue;
      const [tool, borrower] = await Promise.all([ctx.db.get(loan.toolId), ctx.db.get(loan.borrowerId)]);
      if (!borrower) continue;
      due.push({
        loanId: loan._id,
        reminderKey: key,
        toolName: tool?.name ?? "a tool",
        endDate: loan.endDate,
        daysOverdue: daysBetween(loan.endDate, today),
        borrower: { email: borrower.email, firstName: firstName(borrower) },
      });
    }
    return due;
  },
});

export type ReminderWriteResult = "created" | "updated" | "duplicate" | "invalid";

/**
 * Idempotent write-back keyed by `${loanId}:${day}`. Replays and retries of a
 * "sent" result are no-ops; a "failed" result can later be upgraded to "sent".
 */
export const recordReminder = internalMutation({
  args: {
    key: v.string(),
    loanId: v.string(),
    status: v.union(v.literal("sent"), v.literal("failed")),
    detail: v.optional(v.string()),
  },
  handler: async (ctx, { key, loanId, status, detail }): Promise<ReminderWriteResult> => {
    const id = ctx.db.normalizeId("loans", loanId);
    const day = key.slice(loanId.length + 1);
    if (!id || !key.startsWith(`${loanId}:`) || !isValidIsoDay(day) || !(await ctx.db.get(id))) return "invalid";

    const existing = await ctx.db
      .query("reminders")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    const trimmed = detail?.slice(0, 500);
    if (!existing) {
      await ctx.db.insert("reminders", { key, loanId: id, status, detail: trimmed });
      return "created";
    }
    if (existing.status === "sent" || (existing.status === status && existing.detail === trimmed)) return "duplicate";
    await ctx.db.patch(existing._id, { status, detail: trimmed });
    return "updated";
  },
});

/** Failure reports from the n8n error workflow, deduplicated by execution id. */
export const recordFailure = internalMutation({
  args: { key: v.string(), workflow: v.string(), node: v.optional(v.string()), message: v.string() },
  handler: async (ctx, { key, workflow, node, message }) => {
    const existing = await ctx.db
      .query("automationFailures")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (existing) return "duplicate";
    await ctx.db.insert("automationFailures", {
      source: "n8n",
      key,
      workflow: workflow.slice(0, 100),
      node: node?.slice(0, 100),
      message: message.slice(0, 1000),
    });
    return "created";
  },
});
