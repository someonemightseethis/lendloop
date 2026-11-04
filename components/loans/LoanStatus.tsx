import type { LoanStatus as Status } from "@/convex/lib/domain";
import { StatusPill } from "@/components/ui/StatusPill";

export function LoanStatus({ status, overdue }: { status: Status; overdue: boolean }) {
  return overdue ? <StatusPill tone="overdue" /> : <StatusPill tone={status} />;
}
