"use client";

import { useState, type FormEvent } from "react";
import { CATEGORIES, CONDITIONS, type Category, type Condition } from "@/convex/lib/domain";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { ErrorNote } from "@/components/ui/States";
import { categoryLabel, conditionLabel } from "@/lib/format";

export type ToolDraft = { name: string; category: Category; condition: Condition; description: string };

const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({ value: c, label: categoryLabel(c) }));
const CONDITION_OPTIONS = CONDITIONS.map((c) => ({ value: c, label: conditionLabel(c) }));

const EMPTY: ToolDraft = { name: "", category: "power_tools", condition: "good", description: "" };

function pickDraft({ name, category, condition, description }: ToolDraft): ToolDraft {
  return { name, category, condition, description };
}

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
  // Copy only the editable fields: callers may pass a full listing, and Convex rejects unknown fields.
  const [draft, setDraft] = useState<ToolDraft>(() => pickDraft(initial));
  const set = <K extends keyof ToolDraft>(key: K, value: ToolDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if ((await onSubmit(draft)) && initial === EMPTY) setDraft(EMPTY);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Name">
            <Input required minLength={2} maxLength={60} value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="Cordless drill" />
          </Field>
        </div>
        <Field label="Category">
          <Select<Category> name="category" value={draft.category} onChange={(v) => set("category", v)} options={CATEGORY_OPTIONS} />
        </Field>
        <Field label="Condition">
          <Select<Condition> name="condition" value={draft.condition} onChange={(v) => set("condition", v)} options={CONDITION_OPTIONS} />
        </Field>
        <div className="sm:col-span-2">
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
