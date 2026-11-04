import type { LoanView } from "@/convex/lib/loanView";
import { StatusPill } from "@/components/ui/StatusPill";
import { categoryLabel, formatRange } from "@/lib/format";
import { ActivityList } from "./ActivityList";
import { LoanActions, type Perspective } from "./LoanActions";
import { LoanStatus } from "./LoanStatus";

const th = "px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted";
const td = "px-4 py-3 align-top";

export function LoanTable({ loans, perspective }: { loans: LoanView[]; perspective: Perspective }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-card">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="border-b border-border bg-surface-muted/60">
          <tr>
            <th className={th}>Tool</th>
            <th className={th}>Dates</th>
            <th className={th}>{perspective === "owner" ? "Borrower" : "Lender"}</th>
            <th className={th}>Status</th>
            <th className={th}>Activity</th>
            <th className={th}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {loans.map((loan) => (
            <tr key={loan._id} className="transition-colors hover:bg-surface-muted/40">
              <td className={td}>
                <div className="font-medium">{loan.tool.name}</div>
                <div className="text-xs text-muted">{loan.tool.removed ? "Listing removed" : categoryLabel(loan.tool.category)}</div>
              </td>
              <td className={`${td} whitespace-nowrap`}>{formatRange(loan.startDate, loan.endDate)}</td>
              <td className={td}>
                <div className="flex flex-wrap items-center gap-1.5">
                  {loan.counterpart.name}
                  {loan.counterpart.trustedLender && <StatusPill tone="trusted" />}
                </div>
              </td>
              <td className={td}>
                <LoanStatus status={loan.status} overdue={loan.overdue} />
              </td>
              <td className={td}>
                <ActivityList items={loan.activity} />
              </td>
              <td className={`${td} text-right`}>
                <LoanActions loan={loan} perspective={perspective} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
