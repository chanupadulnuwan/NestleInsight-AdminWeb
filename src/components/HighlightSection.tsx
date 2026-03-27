const flowSteps = [
  {
    title: 'Capture',
    description: 'Field teams record orders, stock positions, visibility checks, and shop observations as they happen.',
  },
  {
    title: 'Connect',
    description: 'Signals roll into territory views that align sales operations, supervisors, and planners around one reality.',
  },
  {
    title: 'Forecast',
    description: 'Decision-makers work from a cleaner intelligence layer that supports sharper forecasting and allocation decisions.',
  },
]

export default function HighlightSection() {
  return (
    <section className="px-6 pb-24 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[2.2rem] border border-[#2b120a] dark-panel px-6 py-10 text-white sm:px-10 sm:py-12 lg:px-14">
        <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#f0b87f]/20 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#efb068]">
              <span className="h-2 w-2 rounded-full bg-[#efb068]" />
              Forecasting Intelligence
            </span>

            <h2 className="mt-6 max-w-xl font-display text-3xl font-semibold leading-tight tracking-[-0.03em] text-[#fff3e8] sm:text-4xl lg:text-[3rem]">
              Turning field activity into forecasting intelligence.
            </h2>

            <p className="mt-5 max-w-xl text-base leading-8 text-[#ebd7c7] sm:text-lg">
              The page above explains the problem. This layer shows the operating promise: market activity gets captured once, connected across the distribution network, and elevated into decision-ready insight.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {['Outlet-level signals', 'Route-aware visibility', 'Forecast-ready outputs'].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-[#f1dcc9] backdrop-blur-sm"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute left-10 top-6 hidden h-[82%] w-px bg-gradient-to-b from-transparent via-[#efb068] to-transparent lg:block" />

            <div className="space-y-5">
              {flowSteps.map((step, index) => (
                <article
                  key={step.title}
                  className="rounded-[1.75rem] border border-white/10 bg-white/6 p-6 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-[#efb068]/30 hover:bg-white/8"
                >
                  <div className="flex items-start gap-4">
                    <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#efb068]/12 text-lg font-semibold text-[#ffd9b6] shadow-[inset_0_0_0_1px_rgba(239,176,104,0.18)]">
                      0{index + 1}
                    </span>
                    <div>
                      <h3 className="text-xl font-semibold text-[#fff2e6]">{step.title}</h3>
                      <p className="mt-2 text-base leading-8 text-[#ead6c6]">{step.description}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-[#1f0c06]/72 p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#efb068]">
                    Signal quality
                  </p>
                  <p className="mt-2 text-lg text-[#fff4eb]">
                    Cleaner inputs create more dependable demand decisions.
                  </p>
                </div>

                <div className="flex items-center gap-3 text-[#efb068]">
                  <span className="h-3 w-3 rounded-full bg-[#efb068] shadow-[0_0_0_8px_rgba(239,176,104,0.12)]" />
                  <span className="h-px w-20 bg-gradient-to-r from-[#efb068] to-transparent" />
                  <svg viewBox="0 0 48 24" className="h-6 w-12" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M2 18c7 0 9-11 16-11s9 10 16 10c5 0 7-5 12-5" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
