"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AllLoans } from "@/components/admin/AllLoans";
import { AutomationFailures } from "@/components/admin/AutomationFailures";
import { Members } from "@/components/admin/Members";
import { EmptyState, LoadingRows, PageHeader } from "@/components/ui/States";

export default function AdminPage() {
  const me = useQuery(api.users.me);
  if (me === undefined || me === null) return <LoadingRows />;
  if (me.role !== "admin") return <EmptyState title="Admins only">You don&apos;t have access to this page.</EmptyState>;

  return (
    <>
      <PageHeader title="Admin" description="Moderate listings from All tools. Every action here is re-checked on the server." />
      <div className="space-y-10">
        <AutomationFailures />
        <AllLoans />
        <Members />
      </div>
    </>
  );
}
