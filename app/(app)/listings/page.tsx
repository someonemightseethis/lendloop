"use client";

import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { ListingRow } from "@/components/tools/ListingRow";
import { ToolForm } from "@/components/tools/ToolForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState, LoadingRows, PageHeader } from "@/components/ui/States";
import { useSafeMutation } from "@/lib/useSafeMutation";

export default function ListingsPage() {
  const listings = useQuery(api.tools.mine);
  const create = useSafeMutation(api.tools.create);
  const [adding, setAdding] = useState(false);

  return (
    <>
      <PageHeader
        title="My listings"
        description="Tools you're lending. Deleting a listing declines its pending requests."
        action={!adding && <Button onClick={() => setAdding(true)}>List a tool</Button>}
      />
      {adding && (
        <Card className="mb-6 p-5">
          <h2 className="mb-4 text-sm font-semibold">New listing</h2>
          <ToolForm
            submitLabel="Publish listing"
            pending={create.pending}
            error={create.error}
            onCancel={() => setAdding(false)}
            onSubmit={async (draft) => {
              const ok = await create.call(draft);
              if (ok) setAdding(false);
              return ok;
            }}
          />
        </Card>
      )}
      {listings === undefined ? (
        <LoadingRows />
      ) : listings.length === 0 ? (
        <EmptyState title="You haven't listed anything yet">List a tool and neighbors can request it.</EmptyState>
      ) : (
        <ul className="grid gap-3">
          {listings.map((listing) => (
            <li key={listing._id}>
              <ListingRow listing={listing} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
