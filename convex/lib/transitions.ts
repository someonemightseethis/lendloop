import type { Doc } from "../_generated/dataModel";
import type { LoanStatus } from "./domain";
import { fail } from "./errors";

export type Actor = "owner" | "borrower" | "system";

/**
 * The only legal status changes, and who may make each one. "system" covers
 * side effects such as auto-declining overlapping requests when one is approved.
 */
const TRANSITIONS: Record<LoanStatus, Partial<Record<LoanStatus, readonly Actor[]>>> = {
  requested: { approved: ["owner"], declined: ["owner", "system"], cancelled: ["borrower"] },
  approved: { returned: ["owner"], cancelled: ["borrower", "system"] },
  declined: {},
  cancelled: {},
  returned: {},
};

export function canTransition(from: LoanStatus, to: LoanStatus, actor: Actor): boolean {
  return TRANSITIONS[from][to]?.includes(actor) ?? false;
}

export function assertTransition(loan: Doc<"loans">, to: LoanStatus, actor: Actor): void {
  if (!canTransition(loan.status, to, actor)) {
    fail("CONFLICT", `A ${loan.status} request can't be marked ${to} by the ${actor}.`);
  }
}

/** Resolves the caller's relationship to a loan; anyone else is rejected. */
export function actorFor(loan: Doc<"loans">, user: Doc<"users">): Exclude<Actor, "system"> {
  if (loan.ownerId === user._id) return "owner";
  if (loan.borrowerId === user._id) return "borrower";
  fail("FORBIDDEN", "You can only act on your own tools or your own borrowing.");
}
