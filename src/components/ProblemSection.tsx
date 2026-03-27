import SectionIntro from './SectionIntro'

const blindSpots = [
  {
    title: 'Blind retail spots',
    description:
      'Manual updates and delayed store records leave planners without the real picture on shelf movement and outlet demand.',
  },
  {
    title: 'Forecast drift',
    description:
      'When route-level demand is missing, replenishment and forecasting models react too late to what the market is actually doing.',
  },
  {
    title: 'Disconnected action',
    description:
      'Supervisors, field teams, and planners spend valuable time reconciling partial reports instead of acting with confidence.',
  },
]

const solutionSignals = [
  'Real-time shop records',
  'Territory-level visibility',
  'Forecast-ready demand signals',
]

export default function ProblemSection() {
  return (
    <section id="about" className="section-shell px-6 py-24 sm:px-8 sm:py-28 lg:px-10">
      <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
        <div className="relative">
          <SectionIntro
            eyebrow="Why This Matters"
            title="Solving the data black hole in small retail distribution."
            description="INSIGHT captures the missing signals that usually disappear between shops, routes, territories, and head office planning. The result is clearer visibility, faster response, and stronger forecasting confidence."
          />

          <div className="mt-8 space-y-4">
            {blindSpots.map((spot) => (
              <div
                key={spot.title}
                className="rounded-2xl border border-[#f1e1cf] bg-white/90 px-5 py-5 shadow-[0_18px_42px_rgba(58,26,7,0.06)] backdrop-blur-sm"
              >
                <div className="flex items-start gap-4">
                  <span className="mt-1 inline-flex h-3 w-3 shrink-0 rounded-full bg-[#d17d39] shadow-[0_0_0_6px_rgba(209,125,57,0.12)]" />
                  <div>
                    <h3 className="text-lg font-semibold text-[#1f1610]">{spot.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-[#675347] sm:text-base">{spot.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="soft-panel card-sheen relative overflow-hidden rounded-[2rem] border border-[#eed9c2] p-8 sm:p-10">
            <div className="absolute -right-12 top-6 h-28 w-28 rounded-full bg-[#f6c28b]/20 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-[#ffe8cd]/60 blur-3xl" />

            <div className="relative grid gap-8 lg:grid-cols-[0.95fr_0.1fr_0.95fr]">
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#ad632c]">
                  Without capture
                </p>
                <div className="rounded-2xl border border-[#f3e3d1] bg-[#fffdfa] p-5">
                  <h3 className="text-lg font-semibold text-[#1f1610]">Outlet data stays fragmented</h3>
                  <p className="mt-2 text-sm leading-7 text-[#6d594d]">
                    Orders, stock positions, and visit observations remain trapped in manual channels.
                  </p>
                </div>
                <div className="rounded-2xl border border-[#f3e3d1] bg-[#fffdfa] p-5">
                  <h3 className="text-lg font-semibold text-[#1f1610]">Territory signals arrive late</h3>
                  <p className="mt-2 text-sm leading-7 text-[#6d594d]">
                    Regional demand shifts are only understood after the commercial impact is already visible.
                  </p>
                </div>
              </div>

              <div className="relative hidden lg:block">
                <div className="absolute left-1/2 top-4 h-[88%] w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-[#d17d39] to-transparent" />
                <span className="absolute left-1/2 top-[18%] h-4 w-4 -translate-x-1/2 rounded-full bg-[#d17d39] shadow-[0_0_0_10px_rgba(209,125,57,0.14)]" />
                <span className="absolute left-1/2 top-[50%] h-4 w-4 -translate-x-1/2 rounded-full bg-[#d17d39] shadow-[0_0_0_10px_rgba(209,125,57,0.14)]" />
                <span className="absolute left-1/2 top-[82%] h-4 w-4 -translate-x-1/2 rounded-full bg-[#d17d39] shadow-[0_0_0_10px_rgba(209,125,57,0.14)]" />
              </div>

              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#ad632c]">
                  With INSIGHT
                </p>
                {solutionSignals.map((signal) => (
                  <div
                    key={signal}
                    className="rounded-2xl border border-[#efddca] bg-[linear-gradient(135deg,#fff8f1_0%,#ffffff_100%)] p-5 transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(63,28,10,0.08)]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff0df] text-[#b76525] shadow-[inset_0_0_0_1px_rgba(209,125,57,0.16)]">
                        <svg
                          viewBox="0 0 24 24"
                          className="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M5 12h4l2 3 4-7 4 4" />
                          <path d="M4 19h16" />
                        </svg>
                      </span>
                      <div>
                        <h3 className="text-lg font-semibold text-[#1f1610]">{signal}</h3>
                        <p className="mt-1 text-sm text-[#6d594d]">
                          Structured data that moves from the field into decisions without the usual loss of context.
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative mt-8 rounded-[1.5rem] border border-[#f0d8bd] bg-[#fff8f1]/90 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#a65f2b]">
                Business outcome
              </p>
              <p className="mt-3 text-lg leading-8 text-[#36241a]">
                Every field visit becomes a usable demand signal, making forecasting more grounded, territory decisions more responsive, and distribution planning more precise.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
