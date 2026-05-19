const missionLines = [
  'Capture real-time shop signals, route activity, and',
  'territory movement in one practical system that',
  'small retail teams can actually use every day.',
]

const visionLines = [
  'Turn field evidence into confident forecasting,',
  'faster decisions, and cleaner distribution planning',
  'across shops, warehouses, and territories.',
]

const animatedLines = [
  'mission-vision-line mission-vision-line-primary hidden lg:block left-[-3%] top-[58%] w-[58%] -rotate-[35deg]',
  'mission-vision-line mission-vision-line-secondary hidden lg:block left-[42%] top-[53%] w-[58%] -rotate-[34deg]',
  'mission-vision-line mission-vision-line-soft hidden xl:block left-[10%] top-[16%] w-[34%] rotate-[11deg]',
  'mission-vision-line mission-vision-line-soft hidden xl:block right-[6%] top-[20%] w-[28%] -rotate-[18deg]',
  'mission-vision-line mission-vision-line-tertiary hidden lg:block left-[28%] top-[66%] w-[25%] -rotate-[26deg]',
]

function CopyBlock({
  title,
  lines,
  className,
}: {
  title: string
  lines: string[]
  className: string
}) {
  return (
    <div className={className}>
      <div className="mx-auto max-w-[29rem] text-center">
        <h2 className="font-display text-[3.3rem] font-semibold uppercase leading-none tracking-[-0.05em] text-[#4a2716] sm:text-[4.4rem] lg:text-[5.15rem]">
          {title}
        </h2>
        <div
          className={`mt-6 space-y-2 font-[Georgia,\"Times New Roman\",serif] text-[1.55rem] leading-[1.55] text-[#2b180f] sm:text-[1.85rem] lg:text-[2.05rem]`}
        >
          {lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function MissionVisionSection() {
  return (
    <section
      aria-labelledby="mission-vision-heading"
      className="mission-vision-shell relative overflow-hidden px-0 pb-20 pt-0 sm:pb-24"
    >
      <div className="mission-vision-topfade pointer-events-none absolute inset-x-0 top-0 h-[200px] sm:h-[220px] lg:h-[240px]" />
      <div className="mission-vision-sideglow pointer-events-none absolute inset-0" />

      <div className="relative mx-auto w-full max-w-[1880px]">
        <span id="mission-vision-heading" className="sr-only">
          Mission and vision
        </span>

        {animatedLines.map((line) => (
          <span key={line} className={line} />
        ))}

        <div className="relative grid min-h-[46rem] items-center gap-12 px-4 pb-8 pt-24 sm:px-8 sm:pt-28 lg:min-h-[52rem] lg:grid-cols-[1.08fr_0.84fr_1.08fr] lg:gap-4 lg:px-12 lg:pb-12 lg:pt-32 xl:px-16">
          <CopyBlock
            title="Mission"
            lines={missionLines}
            className="mission-vision-copy animate-rise order-1"
          />

          <div className="mission-vision-logo-wrap animate-rise order-2 flex items-center justify-center lg:translate-y-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(214,166,122,0.24)_0%,rgba(214,166,122,0.08)_36%,transparent_72%)] blur-3xl" />
              <div className="mission-vision-logo-card relative rounded-[2.5rem] px-8 py-7 sm:px-10 sm:py-9 lg:px-11 lg:py-10">
                <img
                  src="/images/mission-vision-logo.png"
                  alt="Nestle Insight logo"
                  className="mx-auto h-auto w-[12.5rem] sm:w-[15rem] lg:w-[17rem] xl:w-[18.5rem]"
                />
              </div>
            </div>
          </div>

          <CopyBlock
            title="Vision"
            lines={visionLines}
            className="mission-vision-copy animate-rise order-3 lg:translate-y-12"
          />
        </div>
      </div>
    </section>
  )
}
