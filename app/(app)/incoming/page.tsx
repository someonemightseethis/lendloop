"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { LoanTable } from "@/components/loans/LoanTable";
import { EmptyState, LoadingRows, PageHeader } from "@/components/ui/States";

export default function IncomingRequestsPage() {
  const loans = useQuery(api.loans.incoming);
  return (
    <>
      <PageHeader
        title="Incoming requests"
        description="Requests for your tools. Approving one declines any overlapping pending requests."
      />
      {loans === undefined ? (
        <LoadingRows />
      ) : loans.length === 0 ? (
        <EmptyState title="No requests for your tools yet">When a neighbor asks to borrow one of your listings, it shows up here.</EmptyState>
      ) : (
        <LoanTable loans={loans} perspective="owner" />
      )}
    </>
  );
}
