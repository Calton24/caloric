import { APP_STORE_URL } from "@/lib/constants";
import { AnimatedProgressPath } from "./AnimatedProgressPath";
import { AppMockup } from "./AppMockup";

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

export function Hero() {
  return (
    <section className="relative overflow-hidden pb-16 pt-6 sm:pb-24 sm:pt-10">
      <AnimatedProgressPath />

      <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:gap-16">
        <div className="max-w-xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/10 px-3.5 py-1.5 text-xs font-medium text-brand-light">
            <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
            AI Calorie Tracker · Now on iOS
          </div>

          <h1 className="text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[3.25rem]">
            Track calories with a photo.
          </h1>

          <p className="mt-5 text-base leading-relaxed text-white/60 sm:text-lg">
            CalCut uses AI to estimate calories, protein, carbs and fats from
            your meals — so you can stay consistent without manual logging.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-2xl bg-brand px-6 py-3.5 text-[15px] font-semibold text-surface shadow-[0_0_32px_rgba(34,197,94,0.35)] transition hover:bg-brand-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              <AppleIcon className="h-5 w-5" />
              Download on iOS
            </a>
            <a
              href="#waitlist"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] px-6 py-3.5 text-[15px] font-semibold text-white transition hover:border-white/25 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              Join Android Waitlist
            </a>
          </div>

          <p className="mt-5 text-sm text-white/40">
            Snap your food. Track calories instantly. Stay lean without manual
            logging.
          </p>
        </div>

        <div className="flex justify-center lg:justify-end">
          <AppMockup />
        </div>
      </div>
    </section>
  );
}
