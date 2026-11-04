import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { vCategory, vCondition, vLoanStatus, vNotificationEvent, vRole } from "./lib/domain";

export default defineSchema({
  users: defineTable({
    /** Stable Clerk identity (issuer + subject). Never trust a client-supplied user id. */
    tokenIdentifier: v.string(),
    name: v.string(),
    email: v.string(),
    role: vRole,
    trustedLender: v.boolean(),
  })
    .index("by_token", ["tokenIdentifier"]),

  tools: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    category: vCategory,
    condition: vCondition,
    description: v.string(),
    /** Soft delete keeps loan history intact. */
    removedAt: v.optional(v.number()),
  })
    .index("by_owner", ["ownerId"])
    .index("by_removed", ["removedAt"]),

  /** A borrow request; once approved it is the loan. Dates are ISO calendar days (YYYY-MM-DD). */
  loans: defineTable({
    toolId: v.id("tools"),
    ownerId: v.id("users"),
    borrowerId: v.id("users"),
    startDate: v.string(),
    endDate: v.string(),
    status: vLoanStatus,
    decidedAt: v.optional(v.number()),
    returnedAt: v.optional(v.number()),
  })
    .index("by_tool_status", ["toolId", "status"])
    .index("by_borrower", ["borrowerId"])
    .index("by_owner", ["ownerId"])
    .index("by_status_end", ["status", "endDate"]),

  /** Outbox for request notifications delivered to n8n. */
  notifications: defineTable({
    loanId: v.id("loans"),
    event: vNotificationEvent,
    recipientId: v.id("users"),
    status: v.union(v.literal("pending"), v.literal("delivered"), v.literal("failed")),
    attempts: v.number(),
    lastError: v.optional(v.string()),
    deliveredAt: v.optional(v.number()),
  })
    .index("by_loan", ["loanId"]),

  /** Overdue reminder results written back by n8n. `key` = `${loanId}:${YYYY-MM-DD}` makes write-backs idempotent. */
  reminders: defineTable({
    key: v.string(),
    loanId: v.id("loans"),
    status: v.union(v.literal("sent"), v.literal("failed")),
    detail: v.optional(v.string()),
  })
    .index("by_key", ["key"])
    .index("by_loan", ["loanId"]),

  /** Failed automation runs, from the n8n error workflow or from exhausted Convex delivery retries. */
  automationFailures: defineTable({
    source: v.union(v.literal("n8n"), v.literal("convex")),
    /** Dedupe key: n8n execution id, or the notification id for Convex-side failures. */
    key: v.string(),
    workflow: v.string(),
    node: v.optional(v.string()),
    message: v.string(),
    resolvedAt: v.optional(v.number()),
  }).index("by_key", ["key"]),
});
