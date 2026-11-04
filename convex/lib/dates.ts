import { fail } from "./errors";

/** Loans use calendar days (YYYY-MM-DD, UTC). Lexicographic order equals date order. */
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;
export const MAX_LOAN_DAYS = 30;

export function isoDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function isValidIsoDay(value: string): boolean {
  if (!ISO_DAY.test(value)) return false;
  const parsed = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed) && isoDay(parsed) === value;
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

export function rangesOverlap(a: { startDate: string; endDate: string }, b: { startDate: string; endDate: string }): boolean {
  return a.startDate <= b.endDate && b.startDate <= a.endDate;
}

export function assertValidRange(startDate: string, endDate: string, today: string): void {
  if (!isValidIsoDay(startDate) || !isValidIsoDay(endDate)) fail("INVALID", "Dates must be valid calendar days.");
  if (endDate < startDate) fail("INVALID", "The end date can't be before the start date.");
  if (startDate < today) fail("INVALID", "The start date can't be in the past.");
  if (daysBetween(startDate, endDate) + 1 > MAX_LOAN_DAYS) fail("INVALID", `Loans can be at most ${MAX_LOAN_DAYS} days.`);
}
