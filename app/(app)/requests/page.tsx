"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { LoanTable } from "@/components/loans/LoanTable";
import { EmptyState, LoadingRows, PageHeader } from "@/components/ui/States";

export default function MyRequestsPage() {
  const loans = useQuery(api.loans.myRequests);
  return (
    <>
      <PageHeader title="My requests" description="Tools you've asked to borrow, and where each request stands." />
      {loans === undefined ? (
        <LoadingRows />
      ) : loans.length === 0 ? (
        <EmptyState title="No requests yet">
          <Link href="/tools" className="font-medium text-accent hover:underline">
            Browse tools
          </Link>{" "}
          and request the dates you need.
        </EmptyState>
      ) : (
        <LoanTable loans={loans} perspective="borrower" />
      )}
    </>
  );
}
