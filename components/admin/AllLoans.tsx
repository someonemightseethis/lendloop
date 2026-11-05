"use client";

import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { vLoanStatus, type LoanStatus as Status } from "@/convex/lib/domain";
import { LoanStatus } from "@/components/loans/LoanStatus";
import { Select } from "@/components/ui/Select";
import { EmptyState, LoadingRows } from "@/components/ui/States";
import { formatRange } from "@/lib/format";

const STATUS_LABELS: Record<Status, string> = {
  requested: "Pending",
  approved: "Approved",
  declined: "Declined",
  cancelled: "Cancelled",
  returned: "Returned",
};
const STATUSES: Status[] = vLoanStatus.members.map((m) => m.value);
const STATUS_OPTIONS: { value: Status | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  ...STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] })),
];
const th = "px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted";

export function AllLoans() {
  const [status, setStatus] = useState<Status | undefined>();
  const loans = useQuery(api.admin.allLoans, { status });

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold">All loans</h2>
        <div className="w-44">
          <Select aria-label="Filter by status" value={status ?? ""} onChange={(v) => setStatus(v || undefined)} options={STATUS_OPTIONS} />
        </div>
      </div>
      {loans === undefined ? (
        <LoadingRows />
      ) : loans.length === 0 ? (
        <EmptyState title="No loans match" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border bg-surface-muted/60">
              <tr>
                <th className={th}>Tool</th>
                <th className={th}>Lender</th>
                <th className={th}>Borrower</th>
                <th className={th}>Dates</th>
                <th className={th}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loans.map((loan) => (
                <tr key={loan._id} className="hover:bg-surface-muted/40">
                  <td className="px-4 py-3 font-medium">{loan.toolName}</td>
                  <td className="px-4 py-3">{loan.ownerName}</td>
                  <td className="px-4 py-3">{loan.borrowerName}</td>
                  <td className="whitespace-nowrap px-4 py-3">{formatRange(loan.startDate, loan.endDate)}</td>
                  <td className="px-4 py-3">
                    <LoanStatus status={loan.status} overdue={loan.overdue} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
