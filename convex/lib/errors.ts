import { ConvexError } from "convex/values";

export type ErrorCode = "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "INVALID" | "CONFLICT";

/** Errors carry a stable code for the client and a human-readable message for the UI. */
export function fail(code: ErrorCode, message: string): never {
  throw new ConvexError({ code, message });
}
