export type PillTone = "available" | "on_loan" | "requested" | "approved" | "declined" | "cancelled" | "returned" | "overdue" | "trusted" | "neutral";

const TONES: Record<PillTone, string> = {
  available: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/50 dark:text-emerald-300",
  on_loan: "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-950/50 dark:text-sky-300",
  requested: "bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-950/50 dark:text-amber-300",
  approved: "bg-accent-soft text-accent-strong ring-accent/25",
  declined: "bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300",
  cancelled: "bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300",
  returned: "bg-teal-50 text-teal-700 ring-teal-600/20 dark:bg-teal-950/50 dark:text-teal-300",
  overdue: "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950/50 dark:text-red-300",
  trusted: "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-950/50 dark:text-violet-300",
  neutral: "bg-surface-muted text-muted ring-border",
};

const LABELS: Partial<Record<PillTone, string>> = { on_loan: "On loan", requested: "Pending", trusted: "Trusted Lender" };

export function StatusPill({ tone, label }: { tone: PillTone; label?: string }) {
  const text = label ?? LABELS[tone] ?? tone.charAt(0).toUpperCase() + tone.slice(1);
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[tone]}`}>
      {text}
    </span>
  );
}
