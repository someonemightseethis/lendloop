import type { Availability } from "@/convex/lib/availability";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatDay } from "@/lib/format";

export function AvailabilityPill({ availability }: { availability: Availability }) {
  if (availability.status === "available") return <StatusPill tone="available" />;
  if (availability.overdue) return <StatusPill tone="overdue" label={`Overdue since ${formatDay(availability.until)}`} />;
  return <StatusPill tone="on_loan" label={`On loan until ${formatDay(availability.until)}`} />;
}
