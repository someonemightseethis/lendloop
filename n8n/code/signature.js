// LendLoop request signing v1, shared by every n8n Code node that signs or verifies.
// Mirrors convex/lib/signature.ts; tests/signature.test.ts checks the two agree.
// Needs NODE_FUNCTION_ALLOW_BUILTIN=crypto.
const crypto = require('crypto');

const REPLAY_WINDOW_SECONDS = 300;

function lendloopSign(secret, body, nowMs = Date.now()) {
  if (!secret) throw new Error('Signing secret is not configured');
  const timestamp = String(Math.floor(nowMs / 1000));
  const mac = crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  return { 'X-LendLoop-Timestamp': timestamp, 'X-LendLoop-Signature': `v1=${mac}` };
}

function lendloopVerify(secret, timestamp, signature, body, nowMs = Date.now()) {
  if (!secret) return { ok: false, reason: 'not_configured' };
  if (!timestamp || !signature) return { ok: false, reason: 'missing_headers' };
  if (!/^\d{1,12}$/.test(timestamp) || !/^v1=[0-9a-f]{64}$/.test(signature)) return { ok: false, reason: 'malformed' };
  if (Math.abs(nowMs / 1000 - Number(timestamp)) > REPLAY_WINDOW_SECONDS) return { ok: false, reason: 'stale' };
  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest();
  const given = Buffer.from(signature.slice(3), 'hex');
  return crypto.timingSafeEqual(expected, given) ? { ok: true } : { ok: false, reason: 'bad_signature' };
}
