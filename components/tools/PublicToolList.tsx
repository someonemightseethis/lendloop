"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/Card";
import { EmptyState, LoadingRows } from "@/components/ui/States";
import { categoryLabel } from "@/lib/format";

/** Read-only and unauthenticated: the query only ever returns id, name and category. */
export function PublicToolList() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return <EmptyState title="No tools available right now">Check back soon, or be the first to lend one.</EmptyState>;
  }
  return <PublicToolQuery />;
}

function PublicToolQuery() {
  const tools = useQuery(api.tools.listPublic);
  if (tools === undefined) return <LoadingRows rows={2} />;
  if (tools.length === 0) return <EmptyState title="No tools available right now">Check back soon, or be the first to lend one.</EmptyState>;

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {tools.map((tool) => (
        <li key={tool.id}>
          <Card className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="truncate text-sm font-medium text-text">{tool.name}</span>
            <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted">{categoryLabel(tool.category)}</span>
          </Card>
        </li>
      ))}
    </ul>
  );
}
