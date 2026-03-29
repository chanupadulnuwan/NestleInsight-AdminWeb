import type { ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import type { AuthUser } from '../api/auth'
import { useAuth } from '../context/AuthContext'
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

function BottomNavIcon({ name }: { name: 'profile' | 'settings' }) {
  if (name === 'settings') {
    return (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  }
  return (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}

const bottomNavItems: Array<{ key: 'profile' | 'settings'; label: string; path: string }> = [
  { key: 'settings', label: 'Settings', path: '/admin/settings' },
  { key: 'profile', label: 'Profile', path: '/admin/profile' },
]

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
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const goToSection = (section: AdminSection) => {
    navigate(
      section === 'dashboard'
        ? '/admin/dashboard'
        : `/admin/dashboard?section=${section}`,
    )
  }

  const activeBottomKey = bottomNavItems.find((item) =>
    location.pathname.startsWith(item.path),
  )?.key

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

          <nav className="mt-8 flex flex-col gap-2">
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

          <div className="mt-auto flex flex-col gap-1 border-t border-white/10 pt-6">
            {bottomNavItems.map((item) => {
              const isActive = activeBottomKey === item.key
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={[
                    'flex items-center gap-3 rounded-[1.35rem] px-3 py-3 text-left transition duration-200',
                    isActive
                      ? 'bg-white/12 text-white shadow-[0_18px_34px_rgba(0,0,0,0.12)]'
                      : 'text-[#e0cdc1] hover:bg-white/8 hover:text-white',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'flex h-11 w-11 items-center justify-center rounded-[1rem] border transition duration-200',
                      isActive
                        ? 'border-[#d7a77e]/55 bg-white/10 text-[#ffd8b0]'
                        : 'border-white/10 bg-black/10 text-[#f2ddca]',
                    ].join(' ')}
                  >
                    <BottomNavIcon name={item.key} />
                  </span>
                  <span className="block truncate text-[0.97rem] font-semibold">
                    {item.label}
                  </span>
                </button>
              )
            })}

            <div className="mt-3 rounded-[1.5rem] border border-white/12 bg-white/6 px-4 py-4 backdrop-blur-sm">
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
              <button
                type="button"
                onClick={() => void logout()}
                className="mt-4 w-full rounded-[1rem] border border-white/12 bg-black/10 px-4 py-2.5 text-sm font-semibold text-[#fff6ee] transition duration-200 hover:bg-white/10"
              >
                Log out
              </button>
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
