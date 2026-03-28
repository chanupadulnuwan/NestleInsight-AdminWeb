import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AuthUser } from '../api/auth'
import { NavGlyph } from '../pages/productsPage.components'
import {
  navigationItems,
  type AdminSection,
} from '../pages/productsPage.helpers'

function formatRoleLabel(role: AuthUser['role']) {
  return role
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function AdminPortalShell({
  user,
  breadcrumb,
  title,
  description,
  children,
  actions,
}: {
  user: AuthUser
  breadcrumb: string
  title: string
  description: string
  children: ReactNode
  actions?: ReactNode
}) {
  const navigate = useNavigate()

  const goToSection = (section: AdminSection) => {
    navigate(
      section === 'dashboard'
        ? '/admin/dashboard'
        : `/admin/dashboard?section=${section}`,
    )
  }

  return (
    <div className="min-h-screen bg-white text-[#1e130c]">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="flex w-full shrink-0 flex-col bg-[linear-gradient(180deg,#341d12_0%,#24130c_48%,#1a0d08_100%)] px-5 py-6 text-[#fff6ee] lg:sticky lg:top-0 lg:h-screen lg:w-[18.75rem] lg:px-6 lg:pt-7 lg:pb-8">
          <div className="border-b border-white/10 pb-6">
            <div className="flex items-center gap-3">
              <div className="rounded-[1rem] bg-white/10 p-2.5 shadow-[0_16px_34px_rgba(0,0,0,0.18)]">
                <img
                  src="/images/insight-logo.png"
                  alt="Nestle Insight"
                  className="h-11 w-auto"
                />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#e1ba97]">
                  Nestle Insight
                </p>
                <p className="mt-1 text-sm text-[#e9d7cb]">Admin Portal</p>
              </div>
            </div>
          </div>

          <nav className="mt-8 flex flex-1 flex-col gap-2">
            {navigationItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => goToSection(item.key)}
                className="flex items-center gap-3 rounded-[1.35rem] px-3 py-3 text-left transition duration-300 hover:bg-white/8"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-[1rem] border border-white/10 bg-black/10 text-[#f2ddca]">
                  <NavGlyph name={item.key} />
                </span>
                <span className="block truncate text-[0.97rem] font-semibold text-[#fff6ee]">
                  {item.label}
                </span>
              </button>
            ))}
          </nav>

          <div className="mt-8 rounded-[1.5rem] border border-white/12 bg-white/6 px-4 py-4 backdrop-blur-sm lg:mt-auto">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#d7965f] to-[#b86d35] text-sm font-bold text-white">
                {user.firstName.charAt(0).toUpperCase()}
                {user.lastName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#fff6ee]">
                  {user.username}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#dcc7b8]">
                  {formatRoleLabel(user.role)}
                </p>
              </div>
            </div>
          </div>
        </aside>

        <main className="section-shell relative flex-1 overflow-hidden bg-white">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-[#fff4e8] via-white to-white" />
          <div className="grain-overlay pointer-events-none absolute inset-0 opacity-[0.05]" />

          <div className="relative flex flex-col gap-6 px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
            <section>
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#a37d63]">
                    {breadcrumb}
                  </p>
                  <h1 className="mt-3 text-[2.2rem] font-bold tracking-[-0.05em] text-[#342015] sm:text-[2.7rem]">
                    {title}
                  </h1>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-[#7f6657] sm:text-[1rem]">
                    {description}
                  </p>
                </div>

                {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
              </div>
            </section>

            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
