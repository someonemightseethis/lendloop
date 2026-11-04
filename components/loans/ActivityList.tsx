import type { ActivityItem } from "@/convex/lib/activity";
import type { NotificationEvent } from "@/convex/lib/domain";
import { timeAgo } from "@/lib/format";

const EVENT_LABELS: Record<NotificationEvent, string> = {
  "request.created": "Owner notified of request",
  "request.approved": "Borrower notified of approval",
  "request.declined": "Borrower notified of decline",
  "request.cancelled": "Owner notified of cancellation",
  "loan.returned": "Borrower notified of return",
  "listing.removed": "Borrower notified listing was removed",
};

function describe(item: ActivityItem): { text: string; failed: boolean } {
  if (item.kind === "reminder") {
    return item.status === "sent" ? { text: "Reminder sent", failed: false } : { text: "Reminder failed", failed: true };
  }
  const label = EVENT_LABELS[item.event];
  if (item.status === "pending") return { text: `${label} (sending)`, failed: false };
  if (item.status === "failed") return { text: `${label}: delivery failed`, failed: true };
  return { text: label, failed: false };
}

/** Recent automation activity on a loan, e.g. "Reminder sent 2 days ago". */
export function ActivityList({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) return <span className="text-xs text-muted">No activity yet</span>;
  return (
    <ul className="space-y-0.5">
      {items.map((item, i) => {
        const { text, failed } = describe(item);
        return (
          <li key={i} className={`text-xs ${failed ? "text-red-600 dark:text-red-400" : "text-muted"}`}>
            {text} <span className="whitespace-nowrap opacity-75">· {timeAgo(item.at)}</span>
          </li>
        );
      })}
    </ul>
  );
}
