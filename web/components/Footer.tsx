import Link from "next/link";
import { APP_STORE_URL } from "@/lib/constants";
import { CalCutLogo } from "./CalCutLogo";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-white/8 py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            <CalCutLogo size="sm" />
            <span className="font-semibold tracking-tight text-white">
              CalCut
            </span>
          </Link>
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
          <Link
            href="/privacy"
            className="transition hover:text-white focus-visible:outline-none focus-visible:text-white"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="transition hover:text-white focus-visible:outline-none focus-visible:text-white"
          >
            Terms
          </Link>
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
