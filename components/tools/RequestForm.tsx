"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { ErrorNote } from "@/components/ui/States";
import { todayIso } from "@/lib/format";
import { useSafeMutation } from "@/lib/useSafeMutation";

/** Inclusive date-range request. The browser enforces the obvious limits; Convex enforces all of them. */
export function RequestForm({ toolId, onSent, onDone }: { toolId: Id<"tools">; onSent: () => void; onDone: () => void }) {
  const today = todayIso();
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const { call, pending, error } = useSafeMutation(api.loans.request);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (await call({ toolId, startDate, endDate })) onSent();
  }

  return (
    <form onSubmit={submit} className="space-y-3 border-t border-border pt-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="From">
          <Input
            type="date"
            required
            min={today}
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              if (endDate < e.target.value) setEndDate(e.target.value);
            }}
          />
        </Field>
        <Field label="Until">
          <Input type="date" required min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </Field>
      </div>
      <ErrorNote message={error} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Sending…" : "Send request"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
