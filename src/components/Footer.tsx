import InsightLogo from './InsightLogo'

const quickLinks = [
  { label: 'Home', href: '#home' },
  { label: 'Why This Matters', href: '#about' },
  { label: 'Platform Value', href: '#products' },
  { label: 'Contact', href: '#contact' },
]

const socialLinks = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/insight-lanka', handle: '/company/insight-lanka' },
  { label: 'Facebook', href: 'https://www.facebook.com/insightlanka', handle: '@insightlanka' },
  { label: 'X', href: 'https://x.com/insightlanka', handle: '@insightlanka' },
  { label: 'Instagram', href: 'https://www.instagram.com/insightlanka', handle: '@insightlanka' },
]

export default function Footer() {
  return (
    <footer id="contact" className="bg-[#100704] text-[#f5e7db]">
      <div className="mx-auto max-w-7xl px-6 py-14 sm:px-8 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_0.7fr_0.9fr_0.8fr]">
          <div>
            <InsightLogo light />
            <p className="mt-6 max-w-sm text-base leading-8 text-[#d9c6b8]">
              Insight Retail Intelligence Sri Lanka helps distribution teams turn shop-level market activity into forecasting confidence, territory visibility, and smarter execution.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.26em] text-[#efb068]">
              Quick links
            </h3>
            <ul className="mt-5 space-y-3">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-base text-[#f5e7db] transition duration-300 hover:text-[#ffd4ae] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#efb068] focus-visible:ring-offset-2 focus-visible:ring-offset-[#100704]"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.26em] text-[#efb068]">
              Contact
            </h3>
            <div className="mt-5 space-y-4 text-base leading-7 text-[#d9c6b8]">
              <p>No. 42, Union Place, Colombo 02, Sri Lanka</p>
              <p>
                <a
                  href="mailto:info@insightlanka.lk"
                  className="transition duration-300 hover:text-[#ffd4ae] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#efb068] focus-visible:ring-offset-2 focus-visible:ring-offset-[#100704]"
                >
                  info@insightlanka.lk
                </a>
                <br />
                <a
                  href="mailto:support@insightlanka.lk"
                  className="transition duration-300 hover:text-[#ffd4ae] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#efb068] focus-visible:ring-offset-2 focus-visible:ring-offset-[#100704]"
                >
                  support@insightlanka.lk
                </a>
                <br />
                <a
                  href="mailto:partnerships@insightlanka.lk"
                  className="transition duration-300 hover:text-[#ffd4ae] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#efb068] focus-visible:ring-offset-2 focus-visible:ring-offset-[#100704]"
                >
                  partnerships@insightlanka.lk
                </a>
              </p>
              <p>
                +94 11 278 4500
                <br />
                +94 76 445 8821
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.26em] text-[#efb068]">
              Social
            </h3>
            <ul className="mt-5 space-y-3">
              {socialLinks.map((social) => (
                <li key={social.label}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/6 bg-white/4 px-4 py-3 text-sm text-[#f5e7db] transition duration-300 hover:border-[#efb068]/28 hover:text-[#ffd4ae] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#efb068] focus-visible:ring-offset-2 focus-visible:ring-offset-[#100704]"
                  >
                    <span>{social.label}</span>
                    <span className="text-[#d5b9a1]">{social.handle}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 text-sm text-[#bda896] sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Insight Retail Intelligence Sri Lanka. All rights reserved.</p>
          <p>Built for modern distribution, forecasting, and retail execution teams.</p>
        </div>
      </div>
    </footer>
  )
}
