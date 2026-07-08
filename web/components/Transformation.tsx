export function Transformation() {
  return (
    <section className="relative py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="relative overflow-hidden rounded-[2rem] border border-brand/20 bg-gradient-to-br from-brand/15 via-surface-elevated to-surface px-6 py-12 sm:px-12 sm:py-16">
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full opacity-40"
            viewBox="0 0 800 400"
            fill="none"
            preserveAspectRatio="none"
          >
            <path
              d="M0 280 C 120 220, 200 320, 320 240 S 520 140, 640 200 S 760 280, 800 220"
              stroke="#22c55e"
              strokeWidth="2"
              strokeDasharray="8 12"
              strokeDashoffset="400"
              className="animate-dash-flow"
              opacity="0.5"
            />
          </svg>

          <div className="relative z-10 mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-light">
              Built for results
            </p>
            <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-[2.75rem]">
              Built for people who want to lose fat, build discipline, and
              understand what they eat.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/55 sm:text-lg">
              CalCut removes the friction that kills streaks. Less logging pain.
              More clarity. Better decisions — one meal at a time.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                { label: "Less friction", value: "Photo → log" },
                { label: "More clarity", value: "Macros daily" },
                { label: "Real progress", value: "Weight + habits" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-white/10 bg-black/20 px-4 py-5 backdrop-blur-sm"
                >
                  <p className="text-xs font-medium uppercase tracking-wider text-white/40">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
