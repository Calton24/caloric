import Link from "next/link";
import { APP_STORE_URL } from "@/lib/constants";
import { CalCutLogo } from "./CalCutLogo";

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 22C7.79 22.05 6.8 20.68 5.96 19.47C4.25 16.98 2.94 12.44 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
    </svg>
  );
}

export function Header() {
  return (
    <header className="relative z-20">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link
          href="/"
          className="group flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <CalCutLogo size="md" />
          <span className="text-[17px] font-semibold tracking-tight text-white">
            CalCut
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-white/60 md:flex">
          <a
            href="#features"
            className="transition hover:text-white focus-visible:outline-none focus-visible:text-white"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="transition hover:text-white focus-visible:outline-none focus-visible:text-white"
          >
            How it works
          </a>
          <a
            href="#waitlist"
            className="transition hover:text-white focus-visible:outline-none focus-visible:text-white"
          >
            Android
          </a>
        </nav>

        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-surface transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <AppleIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Download</span>
          <span className="sm:hidden">iOS</span>
        </a>
      </div>
    </header>
  );
}
