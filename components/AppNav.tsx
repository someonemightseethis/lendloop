"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { StatusPill } from "./ui/StatusPill";

const LINKS = [
  { href: "/tools", label: "All tools" },
  { href: "/listings", label: "My listings" },
  { href: "/requests", label: "My requests" },
  { href: "/incoming", label: "Incoming" },
];

export function AppNav({ isAdmin, trusted }: { isAdmin: boolean; trusted: boolean }) {
  const pathname = usePathname();
  const links = isAdmin ? [...LINKS, { href: "/admin", label: "Admin" }] : LINKS;

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface/85 backdrop-blur">
      <div className="page-container flex flex-wrap items-center gap-x-6 gap-y-2 py-3">
        <Logo href="/tools" />
        <nav aria-label="Main" className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto">
          {links.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  active ? "bg-accent-soft text-accent-strong" : "text-muted hover:bg-surface-muted hover:text-text"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {trusted && <StatusPill tone="trusted" />}
          {isAdmin && <StatusPill tone="neutral" label="Admin" />}
          <UserButton />
        </div>
      </div>
    </header>
  );
}
