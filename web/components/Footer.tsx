import { APP_STORE_URL } from "@/lib/constants";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-white/8 py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div>
          <a
            href="#top"
            className="inline-flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/15 ring-1 ring-brand/30">
              <span className="text-xs font-bold text-brand-light">C</span>
            </span>
            <span className="font-semibold tracking-tight text-white">
              CalCut
            </span>
          </a>
          <p className="mt-2 text-sm text-white/40">AI Calorie Tracker</p>
        </div>

        <nav
          aria-label="Footer"
          className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-white/50"
        >
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="transition hover:text-white focus-visible:outline-none focus-visible:text-white"
          >
            Download on iOS
          </a>
          <a
            href="/privacy"
            className="transition hover:text-white focus-visible:outline-none focus-visible:text-white"
          >
            Privacy Policy
          </a>
          <a
            href="/terms"
            className="transition hover:text-white focus-visible:outline-none focus-visible:text-white"
          >
            Terms
          </a>
        </nav>
      </div>

      <div className="mx-auto mt-8 max-w-6xl px-5 sm:px-8">
        <p className="text-xs text-white/30">
          © {year} CalCut. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
