import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { PublicToolList } from "@/components/tools/PublicToolList";

const STEPS = [
  { title: "List a tool", body: "Add the drill or tent you rarely use, with its condition." },
  { title: "Request dates", body: "Neighbors ask for a date range. You approve or decline." },
  { title: "Get reminders", body: "Automated notifications and overdue reminders keep loans moving." },
];

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden">
      <div aria-hidden className="hero-band absolute inset-x-0 top-0 h-[420px] sm:h-[460px]" />
      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo inverted />
        <SignedIn>
          <Link href="/tools" className="text-sm font-medium text-white/90 hover:text-white">
            Open app →
          </Link>
        </SignedIn>
      </header>

      <main className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <section className="max-w-2xl pb-28 pt-12 sm:pt-16">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">Neighborhood tool lending</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">Borrow what you need. Lend what you don&apos;t.</h1>
          <p className="mt-4 max-w-xl text-base text-white/85">
            LendLoop is a shared shelf for your street: list the tools you can spare and borrow the ones you need for the weekend.
          </p>
          <div className="mt-8">
            <SignedOut>
              <SignInButton mode="modal" forceRedirectUrl="/tools">
                <button type="button" className="inline-flex h-10 items-center rounded-full bg-white px-5 text-sm font-semibold text-[#0a2540] shadow-sm transition hover:bg-white/90">
                  Sign in to lend or borrow →
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link href="/tools" className="inline-flex h-10 items-center rounded-full bg-white px-5 text-sm font-semibold text-[#0a2540] shadow-sm transition hover:bg-white/90">
                Browse tools →
              </Link>
            </SignedIn>
          </div>
        </section>

        <section aria-labelledby="available" className="rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-8">
          <div className="mb-5 flex items-baseline justify-between gap-4">
            <h2 id="available" className="text-lg font-semibold tracking-tight">Available now</h2>
            <span className="text-xs text-muted">Sign in to see details and request dates</span>
          </div>
          <PublicToolList />
        </section>

        <section className="grid gap-6 py-16 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.title}>
              <span className="text-xs font-semibold text-accent">0{i + 1}</span>
              <h3 className="mt-2 text-sm font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm text-muted">{step.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-xs text-muted">
        LendLoop · a neighborhood tool-lending board
      </footer>
    </div>
  );
}
