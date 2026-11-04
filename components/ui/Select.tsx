"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";

export type SelectOption<T extends string> = { value: T; label: string };

const POPOVER_MAX_HEIGHT = 240;
const TYPEAHEAD_RESET_MS = 500;

/**
 * Styled replacement for the native <select>: a select-only combobox (WAI-ARIA APG).
 * Focus stays on the trigger and the highlighted option is exposed through
 * aria-activedescendant. Pass `name` to submit the value with a form.
 */
export function Select<T extends string>({
  value,
  onChange,
  options,
  name,
  id,
  disabled,
  placeholder = "Select…",
  "aria-label": ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly SelectOption<T>[];
  name?: string;
  id?: string;
  disabled?: boolean;
  placeholder?: string;
  "aria-label"?: string;
}) {
  const baseId = useId();
  const listId = `${baseId}-list`;
  const optionId = (i: number) => `${baseId}-opt-${i}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typeahead = useRef({ text: "", timer: 0 as ReturnType<typeof setTimeout> | 0 });

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [dropUp, setDropUp] = useState(false);

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  function openList(index = selectedIndex >= 0 ? selectedIndex : 0) {
    if (disabled || options.length === 0) return;
    const rect = rootRef.current?.getBoundingClientRect();
    setDropUp(!!rect && window.innerHeight - rect.bottom < POPOVER_MAX_HEIGHT + 8 && rect.top > window.innerHeight - rect.bottom);
    setActive(index);
    setOpen(true);
  }

  function choose(index: number) {
    const option = options[index];
    if (option && option.value !== value) onChange(option.value);
    setOpen(false);
  }

  // Close on a pointer press outside the component (blur alone misses Safari, where clicks don't focus buttons).
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (open) listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  useEffect(() => () => clearTimeout(typeahead.current.timer || undefined), []);

  function matchTypeahead(char: string) {
    const state = typeahead.current;
    clearTimeout(state.timer || undefined);
    state.text += char.toLowerCase();
    state.timer = setTimeout(() => (state.text = ""), TYPEAHEAD_RESET_MS);
    // Repeating one letter cycles through options starting with it, like the native control.
    const query = /^(.)\1*$/.test(state.text) ? state.text[0] : state.text;
    const start = (open ? active : Math.max(selectedIndex, 0)) + (query.length === 1 ? 1 : 0);
    for (let step = 0; step < options.length; step++) {
      const i = (start + step) % options.length;
      if (options[i].label.toLowerCase().startsWith(query)) return i;
    }
    return -1;
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    const last = options.length - 1;
    const key = event.key;

    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(key)) {
        event.preventDefault();
        openList();
      } else if (key === "Home" || key === "End") {
        event.preventDefault();
        openList(key === "Home" ? 0 : last);
      } else if (key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
        const match = matchTypeahead(key);
        if (match >= 0) openList(match);
      }
      return;
    }

    switch (key) {
      case "ArrowDown":
        event.preventDefault();
        setActive((i) => Math.min(i + 1, last));
        return;
      case "ArrowUp":
        event.preventDefault();
        if (event.altKey) choose(active);
        else setActive((i) => Math.max(i - 1, 0));
        return;
      case "Home":
      case "PageUp":
        event.preventDefault();
        setActive(0);
        return;
      case "End":
      case "PageDown":
        event.preventDefault();
        setActive(last);
        return;
      case "Enter":
      case " ":
        event.preventDefault();
        choose(active);
        return;
      case "Escape":
        event.preventDefault();
        setOpen(false);
        return;
      case "Tab":
        choose(active);
        return;
    }
    if (key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
      const match = matchTypeahead(key);
      if (match >= 0) setActive(match);
    }
  }

  function onTriggerClick(event: MouseEvent<HTMLButtonElement>) {
    // Keyboard activation (detail 0) is handled in onKeyDown.
    if (event.detail === 0) return;
    if (open) setOpen(false);
    else openList();
  }

  return (
    <div ref={rootRef} className="relative">
      {name && <input type="hidden" name={name} value={value} />}
      <button
        type="button"
        id={id}
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? optionId(active) : undefined}
        disabled={disabled}
        onClick={onTriggerClick}
        onKeyDown={onKeyDown}
        onBlur={() => setOpen(false)}
        className={`flex w-full items-center justify-between gap-2 rounded-md border bg-surface px-3 py-2 text-left text-sm text-text shadow-sm transition-colors focus:border-accent focus:outline-none focus:ring-4 focus:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-60 ${
          open ? "border-accent ring-4 ring-[var(--ring)]" : "border-border hover:border-muted/50"
        }`}
      >
        <span className={`truncate ${selected ? "" : "text-muted/70"}`}>{selected?.label ?? placeholder}</span>
        <svg aria-hidden viewBox="0 0 16 16" className={`size-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        aria-label={ariaLabel}
        hidden={!open}
        tabIndex={-1}
        style={{ maxHeight: POPOVER_MAX_HEIGHT }}
        className={`absolute left-0 z-30 min-w-full overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-pop ${
          dropUp ? "bottom-full mb-1.5" : "top-full mt-1.5"
        }`}
      >
        {options.map((option, i) => {
          const isSelected = option.value === value;
          return (
            <li
              key={option.value}
              id={optionId(i)}
              data-index={i}
              role="option"
              aria-selected={isSelected}
              // Keep focus on the trigger, and stop a wrapping <label> from re-clicking it.
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.preventDefault();
                choose(i);
              }}
              onMouseMove={() => active !== i && setActive(i)}
              className={`flex cursor-pointer select-none items-center justify-between gap-3 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm ${
                i === active ? "bg-surface-muted text-text" : "text-text"
              } ${isSelected ? "font-medium text-accent-strong" : ""}`}
            >
              <span className="truncate">{option.label}</span>
              <svg aria-hidden viewBox="0 0 16 16" className={`size-4 shrink-0 text-accent ${isSelected ? "" : "invisible"}`}>
                <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
