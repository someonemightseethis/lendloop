import { v, type Infer } from "convex/values";

/**
 * Shared enums. The validators are the source of truth; the option lists the
 * UI renders are derived from them, so schema, functions and forms cannot drift.
 */

export const vCategory = v.union(
  v.literal("power_tools"),
  v.literal("hand_tools"),
  v.literal("garden"),
  v.literal("kitchen"),
  v.literal("camping"),
  v.literal("cleaning"),
  v.literal("other"),
);
export const vCondition = v.union(v.literal("new"), v.literal("good"), v.literal("fair"), v.literal("worn"));
export const vRole = v.union(v.literal("user"), v.literal("admin"));
export const vLoanStatus = v.union(
  v.literal("requested"),
  v.literal("approved"),
  v.literal("declined"),
  v.literal("cancelled"),
  v.literal("returned"),
);
/** Notification events sent to n8n: one per request creation or status change. */
export const vNotificationEvent = v.union(
  v.literal("request.created"),
  v.literal("request.approved"),
  v.literal("request.declined"),
  v.literal("request.cancelled"),
  v.literal("loan.returned"),
  v.literal("listing.removed"),
);

export type Category = Infer<typeof vCategory>;
export type Condition = Infer<typeof vCondition>;
export type Role = Infer<typeof vRole>;
export type LoanStatus = Infer<typeof vLoanStatus>;
export type NotificationEvent = Infer<typeof vNotificationEvent>;

export const CATEGORIES: Category[] = vCategory.members.map((m) => m.value);
export const CONDITIONS: Condition[] = vCondition.members.map((m) => m.value);
