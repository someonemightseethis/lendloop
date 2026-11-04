import { CATEGORIES, type Category } from "@/convex/lib/domain";
import { categoryLabel } from "@/lib/format";

export function CategoryFilter({ value, onChange }: { value: Category | undefined; onChange: (value: Category | undefined) => void }) {
  const options: (Category | undefined)[] = [undefined, ...CATEGORIES];
  return (
    <div role="radiogroup" aria-label="Filter by category" className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = option === value;
        return (
          <button
            key={option ?? "all"}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              selected ? "border-accent bg-accent text-white" : "border-border bg-surface text-muted hover:border-accent/50 hover:text-text"
            }`}
          >
            {option ? categoryLabel(option) : "All"}
          </button>
        );
      })}
    </div>
  );
}
