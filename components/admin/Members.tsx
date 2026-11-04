"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorNote, LoadingRows } from "@/components/ui/States";
import { StatusPill } from "@/components/ui/StatusPill";
import { useSafeMutation } from "@/lib/useSafeMutation";

export function Members() {
  const users = useQuery(api.admin.users);
  const setTrusted = useSafeMutation(api.admin.setTrustedLender);

  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold">Members</h2>
      <ErrorNote message={setTrusted.error} />
      {users === undefined ? (
        <LoadingRows rows={2} />
      ) : (
        <Card className="divide-y divide-border">
          {users.map((user) => (
            <div key={user._id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {user.name}
                  {user.role === "admin" && <StatusPill tone="neutral" label="Admin" />}
                  {user.trustedLender && <StatusPill tone="trusted" />}
                </div>
                <div className="truncate text-xs text-muted">{user.email}</div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                disabled={setTrusted.pending}
                onClick={() => setTrusted.call({ userId: user._id, trusted: !user.trustedLender })}
              >
                {user.trustedLender ? "Remove Trusted Lender" : "Mark Trusted Lender"}
              </Button>
            </div>
          ))}
        </Card>
      )}
    </section>
  );
}
