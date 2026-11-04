"use client";

import { api } from "@/convex/_generated/api";
import type { LoanView } from "@/convex/lib/loanView";
import { Button } from "@/components/ui/Button";
import { ErrorNote } from "@/components/ui/States";
import { useSafeMutation } from "@/lib/useSafeMutation";

export type Perspective = "owner" | "borrower";

/** Shows only the actions the viewer may take; Convex validates every one of them again. */
export function LoanActions({ loan, perspective }: { loan: LoanView; perspective: Perspective }) {
  const approve = useSafeMutation(api.loans.approve);
  const decline = useSafeMutation(api.loans.decline);
  const cancel = useSafeMutation(api.loans.cancel);
  const markReturned = useSafeMutation(api.loans.markReturned);
  const busy = approve.pending || decline.pending || cancel.pending || markReturned.pending;
  const error = approve.error ?? decline.error ?? cancel.error ?? markReturned.error;
  const args = { loanId: loan._id };

  const buttons =
    perspective === "owner" ? (
      <>
        {loan.status === "requested" && (
          <>
            <Button size="sm" disabled={busy} onClick={() => approve.call(args)}>
              Approve
            </Button>
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => decline.call(args)}>
              Decline
            </Button>
          </>
        )}
        {loan.status === "approved" && loan.started && (
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => markReturned.call(args)}>
            Mark returned
          </Button>
        )}
      </>
    ) : (
      (loan.status === "requested" || (loan.status === "approved" && !loan.started)) && (
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => cancel.call(args)}>
          Cancel
        </Button>
      )
    );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">{buttons}</div>
      <ErrorNote message={error} />
    </div>
  );
}
