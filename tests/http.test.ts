import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Id } from "../convex/_generated/dataModel";
import { signRequest } from "../convex/lib/signature";
import { day, NOW, setup, type Test } from "./helpers";

const SECRET = "n8n-to-convex-test-secret";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  process.env.N8N_TO_CONVEX_SECRET = SECRET;
});
afterEach(() => {
  vi.useRealTimers();
  delete process.env.N8N_TO_CONVEX_SECRET;
});

async function signedFetch(t: Test, path: string, body = "", opts: { secret?: string; nowMs?: number } = {}) {
  const headers = await signRequest(opts.secret ?? SECRET, body, opts.nowMs);
  return t.fetch(path, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", ...headers },
    ...(body ? { body } : {}),
  });
}

/** One overdue loan: ended two days ago, never returned. */
async function seedOverdueLoan(t: Test): Promise<Id<"loans">> {
  return await t.run(async (ctx) => {
    const ownerId = await ctx.db.insert("users", { tokenIdentifier: "o", name: "Olive Owner", email: "olive@example.com", role: "user", trustedLender: false });
    const borrowerId = await ctx.db.insert("users", { tokenIdentifier: "b", name: "Ben Borrower", email: "ben@example.com", role: "user", trustedLender: false });
    const toolId = await ctx.db.insert("tools", { ownerId, name: "Ladder", category: "hand_tools", condition: "good", description: "" });
    return await ctx.db.insert("loans", { toolId, ownerId, borrowerId, startDate: day(-5), endDate: day(-2), status: "approved" });
  });
}

describe("signed HTTP endpoints", () => {
  it("reject unsigned, wrongly signed and stale requests", async () => {
    const t = setup();
    expect((await t.fetch("/automation/overdue", { method: "GET" })).status).toBe(401);
    expect((await signedFetch(t, "/automation/overdue", "", { secret: "wrong" })).status).toBe(401);
    const stale = await signedFetch(t, "/automation/overdue", "", { nowMs: NOW.getTime() - 6 * 60_000 });
    expect(stale.status).toBe(401);
  });

  it("refuse to work when the secret is not configured", async () => {
    const t = setup();
    delete process.env.N8N_TO_CONVEX_SECRET;
    expect((await signedFetch(t, "/automation/overdue")).status).toBe(503);
  });

  it("list overdue loans with only the fields a reminder needs", async () => {
    const t = setup();
    const loanId = await seedOverdueLoan(t);
    const response = await signedFetch(t, "/automation/overdue");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      date: day(0),
      loans: [
        {
          loanId,
          reminderKey: `${loanId}:${day(0)}`,
          toolName: "Ladder",
          endDate: day(-2),
          daysOverdue: 2,
          borrower: { email: "ben@example.com", firstName: "Ben" },
        },
      ],
    });
  });
});

describe("reminder write-back", () => {
  it("is idempotent: retries and replays never duplicate, and the loan drops off today's list", async () => {
    const t = setup();
    const loanId = await seedOverdueLoan(t);
    const body = JSON.stringify({ key: `${loanId}:${day(0)}`, loanId, status: "sent" });
    const headers = await signRequest(SECRET, body);
    const replay = () => t.fetch("/automation/reminders", { method: "POST", headers, body });

    expect(await (await replay()).json()).toEqual({ result: "created" });
    expect(await (await replay()).json()).toEqual({ result: "duplicate" });
    expect(await (await signedFetch(t, "/automation/reminders", body)).json()).toEqual({ result: "duplicate" });

    const reminders = await t.run((ctx) => ctx.db.query("reminders").collect());
    expect(reminders).toHaveLength(1);
    expect((await (await signedFetch(t, "/automation/overdue")).json()).loans).toEqual([]);
  });

  it("upgrades a failed attempt to sent, but never downgrades", async () => {
    const t = setup();
    const loanId = await seedOverdueLoan(t);
    const key = `${loanId}:${day(0)}`;
    const post = (status: string) => signedFetch(t, "/automation/reminders", JSON.stringify({ key, loanId, status, detail: "smtp down" }));

    expect(await (await post("failed")).json()).toEqual({ result: "created" });
    expect(await (await post("sent")).json()).toEqual({ result: "updated" });
    expect(await (await post("failed")).json()).toEqual({ result: "duplicate" });
    const [reminder] = await t.run((ctx) => ctx.db.query("reminders").collect());
    expect(reminder.status).toBe("sent");
  });

  it("rejects bodies whose key does not belong to the loan", async () => {
    const t = setup();
    const loanId = await seedOverdueLoan(t);
    const forged = JSON.stringify({ key: `someOtherLoan:${day(0)}`, loanId, status: "sent" });
    expect((await signedFetch(t, "/automation/reminders", forged)).status).toBe(422);
    expect((await signedFetch(t, "/automation/reminders", JSON.stringify({ loanId }))).status).toBe(400);
    expect((await signedFetch(t, "/automation/reminders", "not json")).status).toBe(400);
  });
});

describe("failure reports", () => {
  it("are stored once per n8n execution", async () => {
    const t = setup();
    const body = JSON.stringify({ executionId: "42", workflow: "LendLoop: daily overdue reminders", node: "Email borrower", message: "SMTP down" });
    expect(await (await signedFetch(t, "/automation/failures", body)).json()).toEqual({ result: "created" });
    expect(await (await signedFetch(t, "/automation/failures", body)).json()).toEqual({ result: "duplicate" });
    const failures = await t.run((ctx) => ctx.db.query("automationFailures").collect());
    expect(failures).toMatchObject([{ source: "n8n", key: "n8n:42", node: "Email borrower" }]);
  });
});
