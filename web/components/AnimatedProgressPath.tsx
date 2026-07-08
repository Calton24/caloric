export function AnimatedProgressPath() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <svg
        className="absolute -left-[10%] top-[8%] h-[70%] w-[120%] opacity-70"
        viewBox="0 0 1200 700"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="progress-stroke" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0" />
            <stop offset="35%" stopColor="#22c55e" stopOpacity="0.85" />
            <stop offset="70%" stopColor="#4ade80" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="progress-soft" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0" />
            <stop offset="50%" stopColor="#16a34a" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </linearGradient>
          <filter id="progress-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Soft underlay path */}
        <path
          d="M-40 420 C 160 280, 280 540, 460 380 S 780 220, 980 340 S 1180 520, 1280 360"
          stroke="url(#progress-soft)"
          strokeWidth="28"
          strokeLinecap="round"
          className="animate-pulse-glow"
        />

        {/* Main animated calorie/progress curve */}
        <path
          d="M-40 420 C 160 280, 280 540, 460 380 S 780 220, 980 340 S 1180 520, 1280 360"
          stroke="url(#progress-stroke)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="14 16"
          strokeDashoffset="1400"
          filter="url(#progress-glow)"
          className="animate-progress-path"
        />

        {/* Secondary thinner path */}
        <path
          d="M-20 520 C 180 460, 320 600, 520 470 S 820 310, 1040 430 S 1220 580, 1300 480"
          stroke="url(#progress-stroke)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray="6 14"
          strokeDashoffset="800"
          opacity="0.45"
          className="animate-dash-flow"
        />

        {/* Progress node accents */}
        <circle cx="460" cy="380" r="5" fill="#22c55e" className="animate-pulse-glow" />
        <circle cx="460" cy="380" r="12" fill="#22c55e" fillOpacity="0.15" />
        <circle cx="980" cy="340" r="4" fill="#4ade80" className="animate-pulse-glow" />
        <circle cx="980" cy="340" r="10" fill="#4ade80" fillOpacity="0.12" />
      </svg>

      {/* Ambient glow blobs */}
      <div className="absolute left-1/4 top-1/4 h-64 w-64 -translate-x-1/2 rounded-full bg-brand/20 blur-[100px]" />
      <div className="absolute right-0 top-1/3 h-72 w-72 rounded-full bg-brand-dark/25 blur-[120px]" />
    </div>
  );
}
