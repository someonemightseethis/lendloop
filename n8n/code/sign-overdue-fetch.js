// Overdue reminders: sign the (empty-body) GET to Convex.
return [{ json: { headers: lendloopSign($env.N8N_TO_CONVEX_SECRET, '') } }];
