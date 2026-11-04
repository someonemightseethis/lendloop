import Link from "next/link";

export function Logo({ href = "/", inverted = false }: { href?: string; inverted?: boolean }) {
  return (
    <Link href={href} className={`inline-flex items-center gap-2 font-semibold tracking-tight ${inverted ? "text-white" : "text-text"}`}>
      <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" fill="none">
        <rect width="24" height="24" rx="6" fill={inverted ? "rgb(255 255 255 / 0.18)" : "var(--accent)"} />
        <path d="M8.5 15.5a3.5 3.5 0 1 1 0-7h2M15.5 8.5a3.5 3.5 0 1 1 0 7h-2" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      LendLoop
    </Link>
  );
}
