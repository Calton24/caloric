const FEATURES = [
  {
    title: "AI meal scan",
    description:
      "Point your camera at any plate. CalCut estimates calories and macros in seconds — no calorie guessing.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    title: "Barcode scanner",
    description:
      "Scan packaged foods instantly. Pull accurate nutrition from a massive product database.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10M8 4v16M12 7v10M16 5v14M20 8v8" />
      </svg>
    ),
  },
  {
    title: "Macro tracking",
    description:
      "See protein, carbs, and fat in one clean daily view so you can hit targets without spreadsheets.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
      </svg>
    ),
  },
  {
    title: "Weight progress",
    description:
      "Log weight, spot trends, and connect meals to results — so discipline becomes visible.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
        />
      </svg>
    ),
  },
] as const;

export function Features() {
  return (
    <section id="features" className="relative py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-light">
            Features
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Everything you need to stay consistent
          </h2>
          <p className="mt-4 text-base text-white/55 sm:text-lg">
            Built for real life — fast logging, clear macros, and progress you
            can see.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              className="glass-card group rounded-3xl p-6 transition hover:border-brand/30 hover:bg-white/[0.05]"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/15 text-brand-light ring-1 ring-brand/20 transition group-hover:bg-brand/25">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/55">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
