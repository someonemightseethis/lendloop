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
import { ToolForm } from "./ToolForm";

type Listing = FunctionReturnType<typeof api.tools.mine>[number];

export function ListingRow({ listing }: { listing: Listing }) {
  const [editing, setEditing] = useState(false);
  const update = useSafeMutation(api.tools.update);
  const remove = useSafeMutation(api.tools.remove);

  if (editing) {
    return (
      <Card className="p-5">
        <ToolForm
          initial={listing}
          submitLabel="Save changes"
          pending={update.pending}
          error={update.error}
          onCancel={() => setEditing(false)}
          onSubmit={async (draft) => {
            const ok = await update.call({ toolId: listing._id, ...draft });
            if (ok) setEditing(false);
            return ok;
          }}
        />
      </Card>
    );
  }

  return (
    <Card className="flex flex-wrap items-center gap-4 p-5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate font-semibold">{listing.name}</h3>
          <AvailabilityPill availability={listing.availability} />
          {listing.pendingRequests > 0 && (
            <StatusPill tone="requested" label={`${listing.pendingRequests} pending request${listing.pendingRequests > 1 ? "s" : ""}`} />
          )}
        </div>
        <p className="mt-1 text-xs text-muted">
          {categoryLabel(listing.category)} · {conditionLabel(listing.condition)}
          {listing.description && ` · ${listing.description}`}
        </p>
        <div className="mt-2">
          <ErrorNote message={remove.error} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
          Edit
        </Button>
        <ConfirmButton disabled={remove.pending} onConfirm={() => remove.call({ toolId: listing._id })}>
          Delete
        </ConfirmButton>
      </div>
    </Card>
  );
}
