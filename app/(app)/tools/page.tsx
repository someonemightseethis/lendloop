"use client";

import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Category } from "@/convex/lib/domain";
import { CategoryFilter } from "@/components/tools/CategoryFilter";
import { ToolCard } from "@/components/tools/ToolCard";
import { EmptyState, LoadingRows, PageHeader } from "@/components/ui/States";

export default function ToolsPage() {
  const [category, setCategory] = useState<Category | undefined>();
  // One live subscription for the whole catalogue, filtered here: switching categories is instant
  // and never drops back to the loading skeleton.
  const allTools = useQuery(api.tools.list, {});
  const tools = useMemo(() => allTools?.filter((tool) => !category || tool.category === category), [allTools, category]);
  const me = useQuery(api.users.me);

  return (
    <>
      <PageHeader title="All tools" description="Everything your neighbors are lending, with live availability." />
      <div className="mb-6">
        <CategoryFilter value={category} onChange={setCategory} />
      </div>
      {tools === undefined ? (
        <LoadingRows />
      ) : tools.length === 0 ? (
        <EmptyState title="No tools here yet">Try another category, or list one of your own.</EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tools.map((tool) => (
            <li key={tool._id}>
              <ToolCard tool={tool} isAdmin={me?.role === "admin"} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
