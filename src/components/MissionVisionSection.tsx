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
  align,
  className,
}: {
  title: string
  lines: string[]
  align: 'left' | 'right'
  className: string
}) {
  const isRight = align === 'right'

  return (
    <div className={className}>
      <div className={isRight ? 'lg:ml-auto lg:max-w-[25rem] lg:text-right' : 'lg:max-w-[25rem]'}>
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
      className="mission-vision-shell relative overflow-hidden px-4 pb-20 pt-0 sm:px-6 sm:pb-24 lg:px-8 xl:px-10"
    >
      <div className="mission-vision-topfade pointer-events-none absolute inset-x-0 top-0 h-[200px] sm:h-[220px] lg:h-[240px]" />
      <div className="mission-vision-sideglow pointer-events-none absolute inset-0" />

      <div className="relative mx-auto w-full max-w-[1700px]">
        <span id="mission-vision-heading" className="sr-only">
          Mission and vision
        </span>

        {animatedLines.map((line) => (
          <span key={line} className={line} />
        ))}

        <div className="relative grid min-h-[46rem] items-center gap-12 px-4 pb-6 pt-16 sm:px-8 sm:pt-20 lg:min-h-[50rem] lg:grid-cols-[1.08fr_0.84fr_1.08fr] lg:gap-4 lg:px-10 lg:pb-10 lg:pt-24 xl:px-14">
          <CopyBlock
            title="Mission"
            lines={missionLines}
            align="left"
            className="mission-vision-copy animate-rise order-1 lg:-translate-y-[5.5rem]"
          />

          <div className="mission-vision-logo-wrap animate-rise order-2 flex items-center justify-center lg:translate-y-1">
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
            align="right"
            className="mission-vision-copy animate-rise order-3 lg:translate-y-[6rem]"
          />
        </div>
      </div>
    </section>
  )
}
