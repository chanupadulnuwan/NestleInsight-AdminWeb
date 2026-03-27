import type { CSSProperties } from 'react'
import Navbar from './Navbar'

// Animation layer: keep just a few slow particles so the hero still feels premium without moving away from the mockup.
const particles = [
  { left: '10%', top: '24%', size: 3, delay: '0s', duration: '20s', opacity: 0.24 },
  { left: '19%', top: '51%', size: 4, delay: '1.6s', duration: '18s', opacity: 0.18 },
  { left: '33%', top: '39%', size: 2, delay: '0.8s', duration: '17s', opacity: 0.22 },
  { left: '51%', top: '62%', size: 3, delay: '2.4s', duration: '21s', opacity: 0.18 },
  { left: '67%', top: '29%', size: 4, delay: '1.2s', duration: '19s', opacity: 0.24 },
  { left: '78%', top: '54%', size: 3, delay: '2.8s', duration: '20s', opacity: 0.22 },
  { left: '88%', top: '19%', size: 2, delay: '0.5s', duration: '16s', opacity: 0.18 },
]

// Requested feature: theme-matched animated digital metrics for the hero's right side.
const signalLabels = [
  { value: '245.67', className: 'left-[72%] top-[30%] text-[1.1rem]' },
  { value: '+1.23%', className: 'left-[82%] top-[42%] text-[3.35rem] font-semibold tracking-[-0.04em]' },
  { value: '1894', className: 'left-[86%] top-[58%] text-[3.1rem] font-semibold tracking-[-0.04em]' },
  { value: '18.5%', className: 'left-[80%] top-[62%] text-[2.6rem] font-semibold tracking-[-0.04em]' },
  { value: '78.5%', className: 'left-[88%] top-[77%] text-[3.3rem] font-semibold tracking-[-0.04em]' },
]

function HeroChartOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 hidden lg:block">
      {/* Requested feature: add animated line-chart overlays that match the hero theme without changing the base mockup layout. */}
      <svg
        viewBox="0 0 1600 900"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="heroChartPrimary" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,225,198,0.06)" />
            <stop offset="40%" stopColor="#f2c38e" />
            <stop offset="72%" stopColor="#d88944" />
            <stop offset="100%" stopColor="rgba(255,210,166,0.18)" />
          </linearGradient>
          <linearGradient id="heroChartSecondary" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,203,157,0.08)" />
            <stop offset="45%" stopColor="#c97b3e" />
            <stop offset="100%" stopColor="rgba(255,203,157,0.12)" />
          </linearGradient>
          <filter id="heroChartBlur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        <path
          d="M0 760C110 738 182 746 250 786C322 828 402 834 474 760C550 682 628 618 726 635C816 650 870 704 954 686C1036 668 1088 592 1162 576C1268 553 1368 578 1478 700"
          className="hero-chart-secondary"
          fill="none"
          stroke="url(#heroChartSecondary)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M112 835C218 760 326 748 408 842C486 931 574 912 682 760C786 613 892 626 1008 690C1124 753 1250 726 1382 620"
          className="hero-chart-tertiary"
          fill="none"
          stroke="rgba(230, 184, 135, 0.72)"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
        <path
          d="M856 665C926 614 994 592 1059 612C1130 635 1200 627 1262 566C1320 510 1390 506 1470 560"
          filter="url(#heroChartBlur)"
          fill="none"
          stroke="rgba(250, 210, 164, 0.16)"
          strokeWidth="18"
          strokeLinecap="round"
        />
        <path
          d="M826 673C898 624 975 605 1050 624C1129 644 1202 632 1268 569C1330 510 1398 507 1482 565"
          className="hero-chart-primary"
          fill="none"
          stroke="url(#heroChartPrimary)"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <circle cx="1478" cy="560" r="8" className="hero-chart-point" fill="#efb276" />
      </svg>

      {/* Requested feature: add softly animated digital metrics to reinforce the analytical theme on the hero. */}
      {signalLabels.map((item, index) => {
        const style: CSSProperties = {
          animationDelay: `${index * 240}ms`,
        }

        return (
          <span
            key={item.value}
            style={style}
            className={`hero-data-label absolute ${item.className}`}
          >
            {item.value}
          </span>
        )
      })}
    </div>
  )
}

export default function HeroSection({
  onLoginClick,
}: {
  onLoginClick: () => void
}) {
  return (
    <section
      id="home"
      className="relative isolate overflow-hidden border-b border-[#2d1209] bg-[#100603] text-white"
      aria-labelledby="hero-heading"
    >
      {/* Reference-match update: use the uploaded background art directly instead of the previous synthetic hero layers. */}
      <div className="hero-shell absolute inset-0" />
      {/* Animation layer: keep the approved glow effect, but make it light so the mockup composition stays intact. */}
      <div className="hero-ambient absolute inset-0 float-drift opacity-90" />
      <div className="grain-overlay absolute inset-0 opacity-25" />
      <HeroChartOverlay />

      <div className="pointer-events-none absolute inset-0">
        {particles.map((particle, index) => {
          const style: CSSProperties = {
            left: particle.left,
            top: particle.top,
            width: particle.size,
            height: particle.size,
            opacity: particle.opacity,
            animationDelay: particle.delay,
            animationDuration: particle.duration,
          }

          return (
            <span
              key={`${particle.left}-${particle.top}-${index}`}
              className="particle absolute rounded-full bg-[#f7c98d] blur-[1px]"
              style={style}
            />
          )
        })}
      </div>

      {/* Requested tweak: reduce the full-height hero by 1 inch. */}
      <div className="relative z-10 min-h-[calc(100vh-1in)]">
        <Navbar onLoginClick={onLoginClick} />

        {/* Reference-match update: compact left text block, exact line breaks, and smaller copy scale like the target mockup. */}
        {/* Requested tweak: move the entire hero text group about 1 inch lower. */}
        <div className="flex w-full flex-col justify-start px-7 pb-16 pt-[10.6rem] sm:px-9 sm:pb-20 sm:pt-[11.1rem] lg:px-0 lg:pb-16 lg:pl-[2.81cm] lg:pr-10 lg:pt-[11.6rem] xl:pt-[12rem]">
          {/* Requested tweak: widen the desktop text block so the heading stays on exactly two lines above the subtitle. */}
          <div className="max-w-[22rem] sm:max-w-[25rem] lg:max-w-[41rem]">
            {/* Requested tweak: increase the main heading size while keeping the 82% opacity. */}
            <h1
              id="hero-heading"
              className="hero-heading hero-reference-font animate-rise text-[3.95rem] font-[700] leading-[0.92] tracking-[-0.055em] text-[rgba(249,241,234,0.82)] drop-shadow-[0_8px_28px_rgba(0,0,0,0.35)] sm:text-[4.5rem] lg:text-[4.95rem]"
            >
              {/* Animation layer: keep the soft heading glow, but preserve the exact wording from the mockup. */}
              <span className="lg:whitespace-nowrap">Smarter Distribution</span>
              <span className="lg:whitespace-nowrap">Better Decisions</span>
            </h1>

            {/* Requested tweak: increase the Sell.Record.Done line further and keep the exact #CDB6A9 color. */}
            <p
              className="hero-subtitle-font animate-rise mt-4 text-[1.26rem] leading-8 text-[#CDB6A9] sm:text-[1.34rem]"
              style={{ animationDelay: '140ms' }}
            >
              Sell.Record.Done
            </p>

            <div className="animate-rise mt-5" style={{ animationDelay: '260ms' }}>
              {/* Requested tweak: increase the button label size and keep the same #E3CEC3 text color. */}
              <a
                href="#products"
                className="hero-primary-button hero-reference-font inline-flex items-center rounded-[1rem] border border-[#f6e7d8] bg-black/12 px-[1.3rem] py-[0.56rem] text-[1.08rem] font-medium text-[#E3CEC3] transition duration-300 hover:border-white hover:bg-white/6 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#efb068] focus-visible:ring-offset-2 focus-visible:ring-offset-[#180806]"
              >
                Get Started
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
