import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-white shadow-sm hover:bg-accent-strong",
  secondary: "border border-border bg-surface text-text shadow-sm hover:bg-surface-muted",
  ghost: "text-muted hover:bg-surface-muted hover:text-text",
  danger: "border border-border bg-surface text-red-600 shadow-sm hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40",
};

export function buttonClass(variant: Variant = "primary", size: "sm" | "md" = "md") {
  const sizing = size === "sm" ? "h-8 px-3 text-xs" : "h-9 px-4 text-sm";
  return `inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${sizing} ${VARIANTS[variant]}`;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" }) {
  return <button type={type} className={`${buttonClass(variant, size)} ${className}`} {...props} />;
}
