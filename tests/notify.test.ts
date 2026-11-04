import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../convex/_generated/api";
import { MAX_DELIVERY_ATTEMPTS } from "../convex/automation";
import { day, listTool, NOW, setup, signIn } from "./helpers";

const SECRET = "convex-to-n8n-test-secret";
const { lendloopVerify } = new Function("require", `${readFileSync("n8n/code/signature.js", "utf8")}\nreturn { lendloopVerify };`)(
  createRequire(import.meta.url),
) as { lendloopVerify: (s: string, ts: string, sig: string, body: string, now?: number) => { ok: boolean } };

type Captured = { headers: Headers; body: string };

function stubWebhook(status: number) {
  const calls: Captured[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: RequestInit) => {
      calls.push({ headers: new Headers(init.headers), body: String(init.body) });
      return new Response(null, { status });
    }),
  );
  return calls;
}

async function requestATool() {
  const t = setup();
  const owner = await signIn(t, "Olive Owner");
  const borrower = await signIn(t, "Ben Borrower");
  const toolId = await listTool(owner.as, "Ladder");
  await borrower.as.mutation(api.loans.request, { toolId, startDate: day(1), endDate: day(2) });
  return { t, owner };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  process.env.N8N_WEBHOOK_URL = "https://n8n.test/webhook/lendloop/request-events";
  process.env.CONVEX_TO_N8N_SECRET = SECRET;
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete process.env.N8N_WEBHOOK_URL;
  delete process.env.CONVEX_TO_N8N_SECRET;
});

describe("request notification delivery", () => {
  it("sends a minimal payload that the n8n Code node accepts", async () => {
    const calls = stubWebhook(202);
    const { t } = await requestATool();
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    expect(calls).toHaveLength(1);
    const [{ headers, body }] = calls;
    expect(lendloopVerify(SECRET, headers.get("X-LendLoop-Timestamp")!, headers.get("X-LendLoop-Signature")!, body, NOW.getTime()).ok).toBe(true);
    const payload = JSON.parse(body);
    expect(Object.keys(payload).sort()).toEqual(["endDate", "event", "eventId", "recipient", "startDate", "toolName"]);
    expect(payload).toMatchObject({ event: "request.created", toolName: "Ladder", recipient: { email: "olive.owner@example.com", firstName: "Olive" } });

    const [notification] = await t.run((ctx) => ctx.db.query("notifications").collect());
    expect(notification).toMatchObject({ status: "delivered", attempts: 1 });
  });

  it("retries with backoff, then records a visible failure", async () => {
    const calls = stubWebhook(500);
    const { t } = await requestATool();
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    expect(calls).toHaveLength(MAX_DELIVERY_ATTEMPTS);
    const [notification] = await t.run((ctx) => ctx.db.query("notifications").collect());
    expect(notification).toMatchObject({ status: "failed", attempts: MAX_DELIVERY_ATTEMPTS, lastError: "n8n responded 500" });
    const failures = await t.run((ctx) => ctx.db.query("automationFailures").collect());
    expect(failures).toMatchObject([{ source: "convex", workflow: "request-notification" }]);
  });
});
