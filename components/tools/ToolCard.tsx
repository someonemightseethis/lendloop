"use client";

import type { FunctionReturnType } from "convex/server";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { ErrorNote } from "@/components/ui/States";
import { StatusPill } from "@/components/ui/StatusPill";
import { categoryLabel, conditionLabel } from "@/lib/format";
import { useSafeMutation } from "@/lib/useSafeMutation";
import { AvailabilityPill } from "./AvailabilityPill";
import { RequestForm } from "./RequestForm";

type Tool = FunctionReturnType<typeof api.tools.list>[number];

export function ToolCard({ tool, isAdmin }: { tool: Tool; isAdmin: boolean }) {
  const [requesting, setRequesting] = useState(false);
  const [sent, setSent] = useState(false);
  const remove = useSafeMutation(api.admin.removeListing);

  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">{categoryLabel(tool.category)}</p>
          <h3 className="mt-1 truncate text-base font-semibold">{tool.name}</h3>
        </div>
        <AvailabilityPill availability={tool.availability} />
      </div>
      {tool.description && <p className="mt-2 line-clamp-3 text-sm text-muted">{tool.description}</p>}
      <dl className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <div>
          <dt className="sr-only">Condition</dt>
          <dd>Condition: {conditionLabel(tool.condition)}</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <dt className="sr-only">Lender</dt>
          <dd>{tool.isMine ? "Your listing" : `Lent by ${tool.owner.name}`}</dd>
          {tool.owner.trustedLender && <StatusPill tone="trusted" />}
        </div>
      </dl>

      <div className="mt-auto space-y-3 pt-4">
        {sent && <p className="text-sm text-emerald-700 dark:text-emerald-300">Request sent. Track it under My requests.</p>}
        {requesting && (
          <RequestForm
            toolId={tool._id}
            onDone={() => setRequesting(false)}
            onSent={() => {
              setRequesting(false);
              setSent(true);
            }}
          />
        )}
        {((!tool.isMine && !sent && !requesting) || isAdmin) && (
          <div className="flex flex-wrap gap-2">
            {!tool.isMine && !sent && !requesting && (
              <Button size="sm" variant="secondary" onClick={() => setRequesting(true)}>
                Request to borrow
              </Button>
            )}
            {isAdmin && (
              <ConfirmButton disabled={remove.pending} onConfirm={() => remove.call({ toolId: tool._id })}>
                Remove listing
              </ConfirmButton>
            )}
          </div>
        )}
        <ErrorNote message={remove.error} />
      </div>
    </Card>
  );
}
