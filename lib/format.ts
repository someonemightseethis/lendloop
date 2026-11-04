import { ConvexError } from "convex/values";
import type { Category, Condition } from "@/convex/lib/domain";

const CATEGORY_LABELS: Record<Category, string> = {
  power_tools: "Power tools",
  hand_tools: "Hand tools",
  garden: "Garden",
  kitchen: "Kitchen",
  camping: "Camping",
  cleaning: "Cleaning",
  other: "Other",
};

const CONDITION_LABELS: Record<Condition, string> = { new: "Like new", good: "Good", fair: "Fair", worn: "Well used" };

export const categoryLabel = (category: Category) => CATEGORY_LABELS[category];
export const conditionLabel = (condition: Condition) => CONDITION_LABELS[condition];

const dayFormat = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" });

export function formatDay(isoDay: string): string {
  return dayFormat.format(new Date(`${isoDay}T00:00:00Z`));
}

export function formatRange(startDate: string, endDate: string): string {
  return startDate === endDate ? formatDay(startDate) : `${formatDay(startDate)} – ${formatDay(endDate)}`;
}

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

/** "2 days ago", "5 minutes ago", "just now". */
export function timeAgo(ms: number, now = Date.now()): string {
  const diff = ms - now;
  for (const [unit, size] of UNITS) {
    if (Math.abs(diff) >= size) return relative.format(Math.round(diff / size), unit);
  }
  return "just now";
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** User-facing message for a failed Convex call. Server errors carry a safe message; anything else is generic. */
export function errorMessage(error: unknown): string {
  if (error instanceof ConvexError && typeof error.data?.message === "string") return error.data.message;
  return "Something went wrong. Please try again.";
}
