export function AppMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[280px] animate-float-soft sm:max-w-[300px]">
      {/* Device frame */}
      <div className="relative overflow-hidden rounded-[2.25rem] border border-white/12 bg-gradient-to-b from-[#1a221e] to-[#0d1210] p-2.5 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.7),0_0_0_1px_rgba(34,197,94,0.12)]">
        <div className="overflow-hidden rounded-[1.85rem] bg-[#0a0e0c]">
          {/* Status bar */}
          <div className="flex items-center justify-between px-5 pt-3.5 pb-2">
            <span className="text-[11px] font-medium text-white/70">9:41</span>
            <div className="h-5 w-24 rounded-full bg-black" />
            <div className="flex items-center gap-1">
              <div className="h-2 w-3.5 rounded-sm bg-white/50" />
              <div className="h-2.5 w-5 rounded-sm bg-white/50" />
            </div>
          </div>

          {/* App content */}
          <div className="space-y-4 px-4 pb-6 pt-2">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-brand-light/80">
                Today
              </p>
              <p className="mt-0.5 text-lg font-semibold text-white">
                Calorie budget
              </p>
            </div>

            {/* Ring card */}
            <div className="glass-card rounded-2xl p-4">
              <div className="flex items-center gap-4">
                <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
                  <svg className="absolute inset-0 -rotate-90" viewBox="0 0 80 80">
                    <circle
                      cx="40"
                      cy="40"
                      r="32"
                      fill="none"
                      stroke="rgba(255,255,255,0.08)"
                      strokeWidth="6"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="32"
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 32}`}
                      strokeDashoffset={`${2 * Math.PI * 32 * 0.32}`}
                    />
                  </svg>
                  <div className="text-center">
                    <p className="text-lg font-bold leading-none text-white">
                      1,420
                    </p>
                    <p className="mt-0.5 text-[9px] text-white/45">left</p>
                  </div>
                </div>
                <div className="min-w-0 flex-1 space-y-2.5">
                  <MacroBar label="Protein" value="96g" pct={72} color="#60a5fa" />
                  <MacroBar label="Carbs" value="148g" pct={58} color="#fbbf24" />
                  <MacroBar label="Fat" value="52g" pct={45} color="#f472b6" />
                </div>
              </div>
            </div>

            {/* Meal row */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-white/50">Recent meals</p>
              <MealRow
                title="Chicken bowl"
                meta="AI scan · Lunch"
                kcal="540"
              />
              <MealRow
                title="Greek yogurt"
                meta="Barcode · Snack"
                kcal="180"
              />
            </div>

            {/* Scan CTA mock */}
            <div className="flex items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3.5 text-sm font-semibold text-surface shadow-[0_0_24px_rgba(34,197,94,0.35)]">
              <CameraIcon />
              Snap meal
            </div>
          </div>
        </div>
      </div>

      {/* Floating badge */}
      <div className="absolute -right-3 top-16 glass-card rounded-2xl px-3 py-2 shadow-lg sm:-right-6">
        <p className="text-[10px] font-medium text-brand-light">AI estimate</p>
        <p className="text-sm font-semibold text-white">+540 kcal</p>
      </div>
      <div className="absolute -left-2 bottom-28 glass-card rounded-2xl px-3 py-2 shadow-lg sm:-left-8">
        <p className="text-[10px] font-medium text-white/50">Streak</p>
        <p className="text-sm font-semibold text-white">12 days</p>
      </div>
    </div>
  );
}

function MacroBar({
  label,
  value,
  pct,
  color,
}: {
  label: string;
  value: string;
  pct: number;
  color: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px]">
        <span className="text-white/55">{label}</span>
        <span className="font-medium text-white/80">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function MealRow({
  title,
  meta,
  kcal,
}: {
  title: string;
  meta: string;
  kcal: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-2.5 ring-1 ring-white/[0.06]">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/15 text-brand-light">
        <span className="text-xs font-bold">AI</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{title}</p>
        <p className="truncate text-[10px] text-white/40">{meta}</p>
      </div>
      <p className="text-xs font-semibold text-white/80">{kcal}</p>
    </div>
  );
}

function CameraIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}
