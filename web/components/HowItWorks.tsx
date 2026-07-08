const STEPS = [
  {
    step: "01",
    title: "Snap your meal",
    description:
      "Open the camera, take a quick photo of your plate or scan a barcode. No typing required.",
  },
  {
    step: "02",
    title: "Review calories and macros",
    description:
      "Confirm the AI estimate for calories, protein, carbs, and fats — adjust if you want, then log.",
  },
  {
    step: "03",
    title: "Stay on track daily",
    description:
      "Watch your budget, macros, and weight trend update so small daily wins compound into results.",
  },
] as const;

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-light">
            How it works
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Three steps. Zero friction.
          </h2>
        </div>

        <div className="relative mt-14">
          {/* Connecting line (desktop) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent lg:block"
          />

          <ol className="grid gap-6 lg:grid-cols-3">
            {STEPS.map((item) => (
              <li
                key={item.step}
                className="glass-card relative rounded-3xl p-7"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand text-sm font-bold text-surface shadow-[0_0_20px_rgba(34,197,94,0.4)]">
                  {item.step}
                </span>
                <h3 className="mt-5 text-xl font-semibold text-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/55">
                  {item.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
