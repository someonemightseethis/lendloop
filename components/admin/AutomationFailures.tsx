"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState, ErrorNote, LoadingRows } from "@/components/ui/States";
import { StatusPill } from "@/components/ui/StatusPill";
import { timeAgo } from "@/lib/format";
import { useSafeMutation } from "@/lib/useSafeMutation";

/** Failed n8n executions (reported by the error workflow) and webhook deliveries Convex gave up on. */
export function AutomationFailures() {
  const failures = useQuery(api.admin.automationFailures);
  const resolve = useSafeMutation(api.admin.resolveFailure);
  const open = failures?.filter((f) => f.resolvedAt === undefined).length ?? 0;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold">Automation failures</h2>
        {open > 0 && <StatusPill tone="overdue" label={`${open} open`} />}
      </div>
      <ErrorNote message={resolve.error} />
      {failures === undefined ? (
        <LoadingRows rows={2} />
      ) : failures.length === 0 ? (
        <EmptyState title="No failed runs">Workflow errors and undelivered notifications appear here.</EmptyState>
      ) : (
        <Card className="divide-y divide-border">
          {failures.map((failure) => (
            <div key={failure._id} className={`flex flex-wrap items-start gap-3 px-4 py-3 ${failure.resolvedAt ? "opacity-60" : ""}`}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {failure.workflow}
                  {failure.node && <span className="text-xs font-normal text-muted">at {failure.node}</span>}
                  <StatusPill tone="neutral" label={failure.source} />
                </div>
                <p className="mt-1 break-words font-mono text-xs text-muted">{failure.message}</p>
                <p className="mt-1 text-xs text-muted">{timeAgo(failure._creationTime)}</p>
              </div>
              {failure.resolvedAt ? (
                <StatusPill tone="returned" label="Resolved" />
              ) : (
                <Button size="sm" variant="secondary" disabled={resolve.pending} onClick={() => resolve.call({ failureId: failure._id })}>
                  Mark resolved
                </Button>
              )}
            </div>
          ))}
        </Card>
      )}
    </section>
  );
}
