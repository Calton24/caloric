import Link from "next/link";
import { CalCutLogo } from "./CalCutLogo";
import { Footer } from "./Footer";

type LegalPageShellProps = {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
};

function BackIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 19l-7-7m0 0l7-7m-7 7h18"
      />
    </svg>
  );
}

export function LegalPageShell({
  title,
  updatedAt,
  children,
}: LegalPageShellProps) {
  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top,_rgba(34,197,94,0.1)_0%,_transparent_55%)]"
      />

      <header className="relative z-20 border-b border-white/8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link
            href="/"
            className="group flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            <CalCutLogo size="md" />
            <span className="text-[17px] font-semibold tracking-tight text-white">
              CalCut
            </span>
          </Link>

          <Link
            href="/"
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            <BackIcon />
            Home
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-white/50 transition hover:text-brand-light focus-visible:outline-none focus-visible:text-brand-light"
        >
          <BackIcon />
          Back to home
        </Link>

        <article className="glass-card mt-5 rounded-3xl p-6 sm:mt-6 sm:p-10">
          <header className="border-b border-white/8 pb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-light">
              Legal
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 text-sm text-white/45">
              Last updated: {updatedAt}
            </p>
          </header>

          <div className="legal-prose mt-8">{children}</div>
        </article>

        <nav
          aria-label="Legal documents"
          className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/45"
        >
          <Link
            href="/privacy"
            className="transition hover:text-white focus-visible:outline-none focus-visible:text-white"
          >
            Privacy Policy
          </Link>
          <span aria-hidden="true" className="text-white/20">
            ·
          </span>
          <Link
            href="/terms"
            className="transition hover:text-white focus-visible:outline-none focus-visible:text-white"
          >
            Terms of Service
          </Link>
        </nav>
      </main>

      <Footer />
    </div>
  );
}
