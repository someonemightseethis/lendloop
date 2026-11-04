/**
 * LendLoop request signing, v1. The same spec is implemented for n8n in
 * n8n/code/signature.js; tests/signature.test.ts checks both against each other.
 *
 *   X-LendLoop-Timestamp: <unix seconds>
 *   X-LendLoop-Signature: v1=<hex HMAC-SHA256(secret, `${timestamp}.${rawBody}`)>
 *
 * The receiver recomputes the MAC over the raw body bytes, compares in constant
 * time (WebCrypto `verify`), and rejects timestamps outside the replay window.
 * Each direction (Convex -> n8n, n8n -> Convex) has its own secret.
 */

export const TIMESTAMP_HEADER = "X-LendLoop-Timestamp";
export const SIGNATURE_HEADER = "X-LendLoop-Signature";
export const REPLAY_WINDOW_SECONDS = 300;

const VERSION_PREFIX = "v1=";
const encoder = new TextEncoder();

export type VerifyFailure = "missing_headers" | "malformed" | "stale" | "bad_signature" | "not_configured";
export type VerifyResult = { ok: true } | { ok: false; reason: VerifyFailure };

function importKey(secret: string, usage: "sign" | "verify"): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [usage]);
}

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

export async function computeSignature(secret: string, timestamp: string, body: string): Promise<string> {
  const mac = await crypto.subtle.sign("HMAC", await importKey(secret, "sign"), encoder.encode(`${timestamp}.${body}`));
  return VERSION_PREFIX + toHex(mac);
}

/** Headers for an outgoing signed request. */
export async function signRequest(secret: string, body: string, nowMs = Date.now()): Promise<Record<string, string>> {
  const timestamp = String(Math.floor(nowMs / 1000));
  return { [TIMESTAMP_HEADER]: timestamp, [SIGNATURE_HEADER]: await computeSignature(secret, timestamp, body) };
}

export async function verifySignature(input: {
  secret: string | undefined;
  timestamp: string | null;
  signature: string | null;
  body: string;
  nowMs?: number;
}): Promise<VerifyResult> {
  const { secret, timestamp, signature, body, nowMs = Date.now() } = input;
  if (!secret) return { ok: false, reason: "not_configured" };
  if (!timestamp || !signature) return { ok: false, reason: "missing_headers" };
  if (!/^\d{1,12}$/.test(timestamp) || !/^v1=[0-9a-f]{64}$/.test(signature)) return { ok: false, reason: "malformed" };
  if (Math.abs(nowMs / 1000 - Number(timestamp)) > REPLAY_WINDOW_SECONDS) return { ok: false, reason: "stale" };

  const valid = await crypto.subtle.verify(
    "HMAC",
    await importKey(secret, "verify"),
    fromHex(signature.slice(VERSION_PREFIX.length)),
    encoder.encode(`${timestamp}.${body}`),
  );
  return valid ? { ok: true } : { ok: false, reason: "bad_signature" };
}
