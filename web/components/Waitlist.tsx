import { WaitlistForm } from "./WaitlistForm";

export function Waitlist() {
  return (
    <section id="waitlist" className="relative scroll-mt-20 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-light">
              Android
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Join the Android waitlist
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-white/55 sm:text-lg">
              CalCut is live on iOS today. Get early access when we launch on
              Android — be first in line for photo-based calorie tracking.
            </p>

            <ul className="mt-8 space-y-3 text-sm text-white/60">
              {[
                "Priority launch notification",
                "Same AI meal scan experience",
                "Free to join — no commitment",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/20 text-brand-light">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <WaitlistForm />
        </div>
      </div>
    </section>
  );
}
