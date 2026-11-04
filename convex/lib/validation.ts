import { fail } from "./errors";

/** Trims and bounds free text so stored values stay predictable. */
export function cleanText(value: string, field: string, { min, max }: { min: number; max: number }): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length < min) fail("INVALID", `${field} must be at least ${min} characters.`);
  if (trimmed.length > max) fail("INVALID", `${field} must be at most ${max} characters.`);
  return trimmed;
}
