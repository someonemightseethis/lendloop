// Runs once per loan, after the email step (which continues on error): report
// "sent" or "failed" back to Convex. The key `${loanId}:${date}` makes the
// write-back idempotent, so n8n retries never create duplicates.
const loan = $('One item per loan').item.json;
const error = $json.error;
const body = JSON.stringify({
  key: loan.reminderKey,
  loanId: loan.loanId,
  status: error ? 'failed' : 'sent',
  ...(error ? { detail: String(error.message ?? error).slice(0, 500) } : {}),
});
return { json: { body, headers: lendloopSign($env.N8N_TO_CONVEX_SECRET, body) } };
