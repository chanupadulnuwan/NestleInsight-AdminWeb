import SectionIntro from './SectionIntro'

const cards = [
  {
    title: 'Mission',
    text: 'To eliminate the data black hole in small retail distribution by capturing real-time shop-level data and connecting shops, territories, and field teams through a unified digital platform.',
  },
  {
    title: 'Vision',
    text: 'To build an intelligent distribution ecosystem powered by accurate data—enabling precise demand forecasting and smarter business decisions.',
  },
]

export default function MissionVisionSection() {
  return (
    <section className="px-6 pb-24 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl rounded-[2.25rem] border border-[#f0ddc8] bg-[linear-gradient(180deg,#fffdfb_0%,#fff7ee_100%)] px-6 py-10 shadow-[0_28px_70px_rgba(58,26,7,0.08)] sm:px-10 sm:py-12 lg:px-14 lg:py-14">
        <SectionIntro
          eyebrow="Mission & Vision"
          title="A sharper operating model for modern distribution."
          description="INSIGHT is built to connect market execution with planning intelligence. These two principles guide how the platform captures signals, structures visibility, and supports better decisions."
          align="center"
        />

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {cards.map((card, index) => (
            <article
              key={card.title}
              className="card-sheen group relative overflow-hidden rounded-[2rem] border border-[#efd7bf] bg-white/95 p-8 transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_60px_rgba(63,28,10,0.12)] sm:p-10"
            >
              <div className="absolute inset-x-8 top-0 h-1 rounded-b-full bg-gradient-to-r from-[#c97935] via-[#efb068] to-[#f8dcc0]" />
              <div className="absolute -right-10 top-6 h-28 w-28 rounded-full bg-[#f9d5ad]/18 blur-3xl transition duration-500 group-hover:scale-125" />

              <div className="relative flex items-start justify-between gap-6">
                <div>
                  <span className="inline-flex items-center gap-3 rounded-full border border-[#f3dcc4] bg-[#fff8f1] px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#aa602a]">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#fff1df] text-sm font-semibold text-[#c26f2f]">
                      0{index + 1}
                    </span>
                    {card.title}
                  </span>
                  <p className="mt-8 text-xl leading-9 text-[#2b1b12] sm:text-[1.55rem]">
                    {card.text}
                  </p>
                </div>

                <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#f2dec8] bg-[#fffaf5] text-[#b9682b] shadow-[inset_0_0_0_1px_rgba(210,127,47,0.1)] sm:inline-flex">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    {card.title === 'Mission' ? (
                      <>
                        <circle cx="12" cy="12" r="8" />
                        <path d="M12 9v6" />
                        <path d="M9 12h6" />
                      </>
                    ) : (
                      <>
                        <path d="M12 3l3 6 6 3-6 3-3 6-3-6-6-3 6-3 3-6Z" />
                        <circle cx="12" cy="12" r="1.4" />
                      </>
                    )}
                  </svg>
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
