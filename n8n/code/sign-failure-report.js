// Error workflow: report the failed execution to Convex (deduped by execution id).
const { execution = {}, workflow = {}, trigger } = $input.first().json;
const error = execution.error ?? trigger?.error ?? {};
const body = JSON.stringify({
  executionId: String(execution.id ?? `trigger-${workflow.id ?? 'unknown'}-${Date.now()}`),
  workflow: workflow.name ?? 'unknown workflow',
  node: execution.lastNodeExecuted ?? error.node?.name,
  message: String(error.message ?? 'Unknown error').slice(0, 1000),
});
return [{ json: { body, headers: lendloopSign($env.N8N_TO_CONVEX_SECRET, body) } }];
