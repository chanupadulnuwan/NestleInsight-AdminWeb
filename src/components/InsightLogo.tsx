type InsightLogoProps = {
  light?: boolean
}

export default function InsightLogo({ light = false }: InsightLogoProps) {
  const textColor = light ? 'text-[#f7e8dc]' : 'text-[#20120b]'
  const accentColor = light ? 'text-[#eec8a7]' : 'text-[#b96f33]'
  const lineColor = light ? 'bg-[#eec8a7]' : 'bg-[#b96f33]'

  return (
    <div className="inline-flex items-end gap-3">
      <div className={`relative hidden h-12 w-12 sm:block ${accentColor}`}>
        <svg
          viewBox="0 0 64 64"
          className="h-full w-full"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 38c6-11 16-16 30-15 6 1 10 3 14 7" />
          <path d="M10 45c8-6 19-7 33-4 6 2 10 4 11 7" />
          <path d="M24 20c2-5 8-8 14-8 8 0 14 5 14 13 0 9-8 16-19 16-8 0-14-4-16-10" />
          <path d="M43 18c5 0 9 4 9 9" />
          <path d="M18 16c0-4 4-8 8-8 3 0 6 2 7 5" />
          <path d="M18 14c-4 0-7 3-7 7" />
          <path d="M50 14l4-5" />
          <path d="M53 18l7-1" />
          <path d="M27 31c4-2 8-2 12 0" />
        </svg>
      </div>
      <div className="leading-none">
        <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${accentColor}`}>
          Nestle
        </p>
        <div className="mt-1 flex items-end gap-2">
          <span className={`font-display text-2xl font-semibold tracking-[0.32em] sm:text-[1.85rem] ${textColor}`}>
            INSIGHT
          </span>
          <span className="mb-[0.38rem] flex items-center gap-1">
            <span className={`h-0.5 w-4 rounded-full ${lineColor}`} />
            <span className={`h-0.5 w-3 rounded-full ${lineColor}`} />
            <span className={`h-0.5 w-2 rounded-full ${lineColor}`} />
          </span>
        </div>
      </div>
    </div>
  )
}
