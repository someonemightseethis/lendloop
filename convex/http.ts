import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction, type ActionCtx } from "./_generated/server";
import { isoDay } from "./lib/dates";
import { SIGNATURE_HEADER, TIMESTAMP_HEADER, verifySignature } from "./lib/signature";

/**
 * Endpoints n8n calls. Every request must be signed with N8N_TO_CONVEX_SECRET
 * (a different secret from the one Convex uses to call n8n). Responses never
 * reveal why a signature was rejected beyond a generic 401.
 */

const MAX_BODY_LENGTH = 16_384;

const json = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

type JsonObject = Record<string, unknown>;
type SignedHandler = (ctx: ActionCtx, body: JsonObject | null) => Promise<Response>;

function signed(handler: SignedHandler) {
  return httpAction(async (ctx, request) => {
    const raw = await request.text();
    if (raw.length > MAX_BODY_LENGTH) return json(413, { error: "payload_too_large" });

    const result = await verifySignature({
      secret: process.env.N8N_TO_CONVEX_SECRET,
      timestamp: request.headers.get(TIMESTAMP_HEADER),
      signature: request.headers.get(SIGNATURE_HEADER),
      body: raw,
    });
    if (!result.ok) {
      console.warn(`Rejected signed request to ${new URL(request.url).pathname}: ${result.reason}`);
      return json(result.reason === "not_configured" ? 503 : 401, { error: "unauthorized" });
    }

    if (!raw) return handler(ctx, null);
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return json(400, { error: "invalid_body" });
      return handler(ctx, parsed as JsonObject);
    } catch {
      return json(400, { error: "invalid_json" });
    }
  });
}

const isString = (value: unknown, max = 200): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= max;

const http = httpRouter();

/** WF2 step 1: overdue loans that still need today's reminder. */
http.route({
  path: "/automation/overdue",
  method: "GET",
  handler: signed(async (ctx) => {
    const today = isoDay(Date.now());
    const loans = await ctx.runQuery(internal.automation.overdueLoans, { today });
    return json(200, { date: today, loans });
  }),
});

/** WF2 step 2: idempotent reminder write-back. */
http.route({
  path: "/automation/reminders",
  method: "POST",
  handler: signed(async (ctx, body) => {
    const status = body?.status;
    if (!body || !isString(body.key) || !isString(body.loanId) || (status !== "sent" && status !== "failed")) {
      return json(400, { error: "invalid_body" });
    }
    const result = await ctx.runMutation(internal.automation.recordReminder, {
      key: body.key,
      loanId: body.loanId,
      status,
      detail: isString(body.detail, 2000) ? body.detail : undefined,
    });
    return result === "invalid" ? json(422, { error: "unknown_loan_or_key" }) : json(200, { result });
  }),
});

/** WF3: the n8n error workflow reports failed executions here so they show in the admin view. */
http.route({
  path: "/automation/failures",
  method: "POST",
  handler: signed(async (ctx, body) => {
    if (!body || !isString(body.executionId) || !isString(body.workflow) || !isString(body.message, 5000)) {
      return json(400, { error: "invalid_body" });
    }
    const result = await ctx.runMutation(internal.automation.recordFailure, {
      key: `n8n:${body.executionId}`,
      workflow: body.workflow,
      node: isString(body.node) ? body.node : undefined,
      message: body.message,
    });
    return json(200, { result });
  }),
});

export default http;
