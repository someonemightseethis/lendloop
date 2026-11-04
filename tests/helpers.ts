import { convexTest } from "convex-test";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import schema from "../convex/schema";
import { isoDay } from "../convex/lib/dates";

const modules = import.meta.glob("../convex/**/*.ts");

export const NOW = new Date("2026-06-01T12:00:00Z");
const DAY = 86_400_000;
/** Calendar day relative to the frozen test clock. */
export const day = (offset: number) => isoDay(NOW.getTime() + offset * DAY);

export function setup() {
  return convexTest(schema, modules);
}

export type Test = ReturnType<typeof setup>;

/** Signs a user in through users.store, exactly as the client does after a Clerk sign-in. */
export async function signIn(t: Test, name: string, opts: { email?: string; emailVerified?: boolean } = {}) {
  const email = opts.email ?? `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`;
  const as = t.withIdentity({ subject: email, name, email, emailVerified: opts.emailVerified ?? true });
  const userId: Id<"users"> = await as.mutation(api.users.store, {});
  return { as, userId, email };
}

export async function listTool(as: Awaited<ReturnType<typeof signIn>>["as"], name = "Cordless drill") {
  return await as.mutation(api.tools.create, { name, category: "power_tools", condition: "good", description: "18V" });
}

/** Asserts a Convex call fails with the given error code. */
export async function expectError(promise: Promise<unknown>, code: string) {
  try {
    await promise;
  } catch (error) {
    const data = (error as { data?: { code?: string } }).data;
    if (data?.code === code) return;
    throw new Error(`Expected ${code}, got ${data?.code ?? String(error)}`);
  }
  throw new Error(`Expected ${code}, but the call succeeded`);
}
