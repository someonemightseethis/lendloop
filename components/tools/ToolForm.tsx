"use client";

import { useState, type FormEvent } from "react";
import { CATEGORIES, CONDITIONS, type Category, type Condition } from "@/convex/lib/domain";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { ErrorNote } from "@/components/ui/States";
import { categoryLabel, conditionLabel } from "@/lib/format";

export type ToolDraft = { name: string; category: Category; condition: Condition; description: string };

const EMPTY: ToolDraft = { name: "", category: "power_tools", condition: "good", description: "" };

/** Create and edit share one form. `onSubmit` resolves true when the save succeeded. */
export function ToolForm({
  initial = EMPTY,
  submitLabel,
  pending,
  error,
  onSubmit,
  onCancel,
}: {
  initial?: ToolDraft;
  submitLabel: string;
  pending: boolean;
  error: string | null;
  onSubmit: (draft: ToolDraft) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const set = <K extends keyof ToolDraft>(key: K, value: ToolDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if ((await onSubmit(draft)) && initial === EMPTY) setDraft(EMPTY);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <Field label="Name">
            <Input required minLength={2} maxLength={60} value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="Cordless drill" />
          </Field>
        </div>
        <Field label="Category">
          <Select value={draft.category} onChange={(e) => set("category", e.target.value as Category)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {categoryLabel(c)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Condition">
          <Select value={draft.condition} onChange={(e) => set("condition", e.target.value as Condition)}>
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {conditionLabel(c)}
              </option>
            ))}
          </Select>
        </Field>
        <div className="sm:col-span-3">
          <Field label="Short description" hint={`${draft.description.length}/280`}>
            <Textarea
              rows={2}
              maxLength={280}
              value={draft.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="18V, two batteries and a charger. Bits not included."
            />
          </Field>
        </div>
      </div>
      <ErrorNote message={error} />
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
