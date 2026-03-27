import { useState } from 'react'

const navItems = [
  { label: 'Home', href: '#home' },
  { label: 'About us', href: '#about' },
  { label: 'Products', href: '#products' },
]

export default function Navbar({
  onLoginClick,
}: {
  onLoginClick: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)

  const closeMenu = () => setIsOpen(false)

  return (
    <header className="relative z-30">
      {/* Requested tweak: keep the logo 1.5cm from the left border and place the Login button 1cm from the right border. */}
      <div className="flex w-full items-center justify-between pb-5 pl-[1.5cm] pr-[1cm] pt-6 lg:pb-4 lg:pt-7">
        <a href="#home" className="shrink-0" aria-label="INSIGHT home">
          {/* Reference-match update: use the uploaded INSIGHT logo asset instead of the previous drawn logo. */}
          {/* Requested tweak: scale the logo up slightly while keeping its left alignment unchanged. */}
          <img
            src="/images/insight-logo.png"
            alt="Nestle Insight"
            className="hero-logo-image block h-auto w-[6rem] sm:w-[6.55rem] lg:w-[6.9rem]"
          />
        </a>

        {/* Requested tweak: set a 2cm rhythm between all desktop nav items and increase the nav text size slightly. */}
        <nav className="hidden items-center gap-[2cm] lg:flex" aria-label="Primary navigation">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="hero-nav-link relative text-[1.2rem] font-medium text-[#E3CEC3] transition duration-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#efb068] focus-visible:ring-offset-2 focus-visible:ring-offset-[#180806]"
            >
              <span className="after:absolute after:-bottom-2 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-[#efb068] after:transition-transform after:duration-300 after:content-[''] hover:after:scale-x-100">
                {item.label}
              </span>
            </a>
          ))}
          {/* Requested tweak: keep the Login button on the same 2cm spacing rhythm and match the slightly larger nav text size. */}
          <button
            type="button"
            // Website auth update: open the centered admin portal modal instead of navigating to a separate login page.
            onClick={onLoginClick}
            className="hero-login-button rounded-xl border border-white/45 bg-transparent px-7 py-2.5 text-[1.2rem] font-medium text-[#E3CEC3] transition duration-300 hover:border-[#f0bf8b] hover:bg-white/6 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#efb068] focus-visible:ring-offset-2 focus-visible:ring-offset-[#180806]"
          >
            Login
          </button>
        </nav>

        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          className="inline-flex items-center justify-center rounded-xl border border-white/25 bg-white/5 p-3 text-[#fff5eb] transition duration-300 hover:border-[#efb068] hover:bg-[#efb068]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#efb068] focus-visible:ring-offset-2 focus-visible:ring-offset-[#180806] lg:hidden"
          aria-label="Toggle navigation menu"
          aria-expanded={isOpen}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            {isOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {isOpen ? (
        <div className="mx-6 rounded-2xl border border-white/10 bg-[#150704]/95 p-5 shadow-[0_30px_60px_rgba(0,0,0,0.34)] backdrop-blur-md lg:hidden">
          <nav className="flex flex-col gap-4" aria-label="Mobile navigation">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={closeMenu}
                className="rounded-xl px-3 py-2 text-base font-medium text-[#f8eee4] transition duration-300 hover:bg-white/5 hover:text-[#ffd3ad] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#efb068] focus-visible:ring-offset-2 focus-visible:ring-offset-[#180806]"
              >
                {item.label}
              </a>
            ))}
            <button
              type="button"
              // Website auth update: keep the mobile nav Login button on the same modal flow as desktop.
              onClick={() => {
                closeMenu()
                onLoginClick()
              }}
              className="mt-2 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-base font-medium text-[#fff5eb] transition duration-300 hover:border-[#efb068] hover:bg-[#efb068]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#efb068] focus-visible:ring-offset-2 focus-visible:ring-offset-[#180806]"
            >
              Login
            </button>
          </nav>
        </div>
      ) : null}
    </header>
  )
}
