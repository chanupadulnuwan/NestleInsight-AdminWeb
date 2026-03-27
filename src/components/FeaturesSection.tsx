import type { ReactNode } from 'react'
import SectionIntro from './SectionIntro'

type Feature = {
  title: string
  description: string
  icon: ReactNode
}

const features: Feature[] = [
  {
    title: 'Shop Visibility',
    description:
      'Capture what each outlet stocks, orders, and sells so teams can act on real market conditions instead of assumptions.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 9l2-4h12l2 4" />
        <path d="M5 9h14v10H5z" />
        <path d="M9 19v-4h6v4" />
      </svg>
    ),
  },
  {
    title: 'Territory Intelligence',
    description:
      'Understand route-by-route demand movement with context from geography, channel mix, and execution quality.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" />
        <path d="M9 4v14" />
        <path d="M15 6v14" />
      </svg>
    ),
  },
  {
    title: 'Field Team Coordination',
    description:
      'Connect sales reps, merchandisers, and supervisors around a shared operating picture and cleaner follow-through.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="9.5" cy="7" r="3" />
        <path d="M21 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16.5 4.15A3 3 0 0 1 18 10" />
      </svg>
    ),
  },
  {
    title: 'Real-Time Data Capture',
    description:
      'Bring orders, stock checks, display audits, and field observations into the platform as activity happens.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <path d="M10 6h4" />
        <path d="M12 17h.01" />
        <path d="M9 13l2 2 4-5" />
      </svg>
    ),
  },
  {
    title: 'Smarter Distribution Planning',
    description:
      'Translate live demand signals into better allocation, route coverage, and replenishment decisions.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 17l5-5 4 4 7-8" />
        <path d="M20 12V6h-6" />
        <path d="M4 4v16h16" />
      </svg>
    ),
  },
  {
    title: 'Forecast-Ready Insights',
    description:
      'Turn raw field activity into a trustworthy intelligence layer for planners, analysts, and leadership teams.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 19h16" />
        <path d="M6 15l3-3 3 2 6-7" />
        <path d="M18 12V7h-5" />
      </svg>
    ),
  },
]

export default function FeaturesSection() {
  return (
    <section id="products" className="section-shell px-6 pb-24 sm:px-8 lg:px-10">
      <div className="relative mx-auto max-w-7xl">
        <SectionIntro
          eyebrow="Platform Value"
          title="Built to manage the operational signals that distribution teams depend on."
          description="The platform brings together outlet visibility, territory context, field execution, and planning intelligence in one premium operating environment."
          align="center"
        />

        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="group card-sheen relative overflow-hidden rounded-[1.75rem] border border-[#f0dcc6] bg-white p-7 shadow-[0_18px_48px_rgba(59,26,8,0.07)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_30px_60px_rgba(59,26,8,0.12)]"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#c97935] via-[#efb068] to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />

              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#fff3e5_0%,#fff8f2_100%)] text-[#b96a2c] shadow-[inset_0_0_0_1px_rgba(209,125,57,0.15)] transition duration-300 group-hover:scale-105 group-hover:bg-[linear-gradient(180deg,#ffe9cd_0%,#fff6ea_100%)]">
                {feature.icon}
              </span>

              <h3 className="mt-6 text-xl font-semibold text-[#20160f]">{feature.title}</h3>
              <p className="mt-3 text-base leading-8 text-[#6a564a]">{feature.description}</p>

              <div className="mt-6 flex items-center gap-3 text-sm font-medium text-[#af622b]">
                <span className="h-px flex-1 bg-gradient-to-r from-[#d17d39] to-transparent" />
                Enterprise-ready
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
