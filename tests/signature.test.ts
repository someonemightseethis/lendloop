import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { computeSignature, REPLAY_WINDOW_SECONDS, signRequest, verifySignature } from "../convex/lib/signature";

/** Loads the exact JavaScript the n8n Code nodes run (n8n/code/signature.js). */
type N8nSignature = {
  lendloopSign: (secret: string, body: string, nowMs?: number) => Record<string, string>;
  lendloopVerify: (secret: string, ts: string, sig: string, body: string, nowMs?: number) => { ok: boolean; reason?: string };
};
const n8n = new Function("require", `${readFileSync("n8n/code/signature.js", "utf8")}\nreturn { lendloopSign, lendloopVerify };`)(
  createRequire(import.meta.url),
) as N8nSignature;

const SECRET = "test-secret-not-real";
const BODY = JSON.stringify({ eventId: "evt_1", event: "request.created" });
const NOW_MS = 1_780_000_000_000;

async function verify(headers: Record<string, string>, body = BODY, nowMs = NOW_MS, secret = SECRET) {
  return verifySignature({
    secret,
    timestamp: headers["X-LendLoop-Timestamp"] ?? null,
    signature: headers["X-LendLoop-Signature"] ?? null,
    body,
    nowMs,
  });
}

describe("signature spec v1", () => {
  it("matches a fixed test vector", async () => {
    // HMAC-SHA256("test-secret-not-real", "1780000000.hello"), computed independently with openssl.
    expect(await computeSignature(SECRET, "1780000000", "hello")).toBe(
      "v1=4e273f341786edb3d4c66760e0000d7a76c40a394f81e8312859c18c7d29e213",
    );
  });

  it("produces identical signatures in Convex and n8n", async () => {
    expect(await signRequest(SECRET, BODY, NOW_MS)).toEqual(n8n.lendloopSign(SECRET, BODY, NOW_MS));
  });

  it("verifies what the other side signed, in both directions", async () => {
    expect(await verify(n8n.lendloopSign(SECRET, BODY, NOW_MS))).toEqual({ ok: true });
    const fromConvex = await signRequest(SECRET, BODY, NOW_MS);
    expect(n8n.lendloopVerify(SECRET, fromConvex["X-LendLoop-Timestamp"], fromConvex["X-LendLoop-Signature"], BODY, NOW_MS)).toEqual({
      ok: true,
    });
  });

  it("rejects a tampered body or the wrong secret", async () => {
    const headers = await signRequest(SECRET, BODY, NOW_MS);
    expect(await verify(headers, BODY.replace("evt_1", "evt_2"))).toEqual({ ok: false, reason: "bad_signature" });
    expect(await verify(headers, BODY, NOW_MS, "other-secret")).toEqual({ ok: false, reason: "bad_signature" });
    expect(n8n.lendloopVerify("other-secret", headers["X-LendLoop-Timestamp"], headers["X-LendLoop-Signature"], BODY, NOW_MS).ok).toBe(false);
  });

  it("rejects replays outside the window, in the past or the future", async () => {
    const headers = await signRequest(SECRET, BODY, NOW_MS);
    const edge = NOW_MS + REPLAY_WINDOW_SECONDS * 1000;
    expect(await verify(headers, BODY, edge)).toEqual({ ok: true });
    expect(await verify(headers, BODY, edge + 1000)).toEqual({ ok: false, reason: "stale" });
    expect(await verify(headers, BODY, NOW_MS - (REPLAY_WINDOW_SECONDS + 1) * 1000)).toEqual({ ok: false, reason: "stale" });
    const ts = headers["X-LendLoop-Timestamp"];
    expect(n8n.lendloopVerify(SECRET, ts, headers["X-LendLoop-Signature"], BODY, edge + 1000)).toEqual({ ok: false, reason: "stale" });
  });

  it("rejects missing, malformed or unconfigured input", async () => {
    const headers = await signRequest(SECRET, BODY, NOW_MS);
    expect(await verify({})).toEqual({ ok: false, reason: "missing_headers" });
    expect(await verify({ ...headers, "X-LendLoop-Signature": "sha256=abc" })).toEqual({ ok: false, reason: "malformed" });
    expect(await verify({ ...headers, "X-LendLoop-Timestamp": "1e9" })).toEqual({ ok: false, reason: "malformed" });
    expect(await verify(headers, BODY, NOW_MS, "")).toEqual({ ok: false, reason: "not_configured" });
    expect(n8n.lendloopVerify("", headers["X-LendLoop-Timestamp"], headers["X-LendLoop-Signature"], BODY, NOW_MS)).toEqual({
      ok: false,
      reason: "not_configured",
    });
  });
});
