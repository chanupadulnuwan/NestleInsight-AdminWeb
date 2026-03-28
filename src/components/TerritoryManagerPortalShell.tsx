import type { ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import type { AuthUser } from '../api/auth'
import { useAuth } from '../context/AuthContext'

type TmSection =
  | 'warehouse'
  | 'approvals'
  | 'orders'
  | 'activity'
  | 'stock'
  | 'settings'
  | 'profile'

const mainNavItems: Array<{ key: TmSection; label: string; path: string }> = [
  { key: 'warehouse', label: 'Warehouse', path: '/tm/warehouse' },
  { key: 'approvals', label: 'Approvals', path: '/tm/approvals' },
  { key: 'orders', label: 'Orders', path: '/tm/orders' },
  { key: 'activity', label: 'Activity Center', path: '/tm/activity-center' },
  { key: 'stock', label: 'Stock', path: '/tm/stock' },
]

const bottomNavItems: Array<{ key: TmSection; label: string; path: string }> = [
  { key: 'settings', label: 'Settings', path: '/tm/settings' },
]

function NavIcon({ section }: { section: TmSection | 'settings' | 'profile' }) {
  if (section === 'warehouse')
    return (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.5L12 4l9 5.5V20H3V9.5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20v-6h6v6" />
      </svg>
    )
  if (section === 'approvals')
    return (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    )
  if (section === 'orders')
    return (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    )
  if (section === 'activity')
    return (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M5 12a7 7 0 1114 0A7 7 0 015 12z" />
      </svg>
    )
  if (section === 'stock')
    return (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    )
  if (section === 'settings')
    return (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  // profile
  return (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}

export function TerritoryManagerPortalShell({
  user,
  breadcrumb,
  title,
  description,
  children,
  actions,
  pendingCounts,
}: {
  user: AuthUser
  breadcrumb: string
  title: string
  description: string
  children: ReactNode
  actions?: ReactNode
  pendingCounts?: { approvals?: number }
}) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const activeSection =
    [...mainNavItems, ...bottomNavItems].find((item) =>
      location.pathname.startsWith(item.path),
    )?.key

  return (
    <div className="min-h-screen bg-white text-[#1e130c]">
      <div className="flex min-h-screen flex-col lg:flex-row">
        {/* Sidebar */}
        <aside className="flex w-full shrink-0 flex-col bg-[linear-gradient(180deg,#341d12_0%,#24130c_48%,#1a0d08_100%)] px-5 py-6 text-[#fff6ee] lg:sticky lg:top-0 lg:h-screen lg:w-[18.75rem] lg:px-6 lg:pt-7 lg:pb-8">
          {/* Logo */}
          <div className="border-b border-white/10 pb-6">
            <div className="flex items-center gap-3">
              <div className="rounded-[1rem] bg-white/10 p-2.5 shadow-[0_16px_34px_rgba(0,0,0,0.18)]">
                <img src="/images/insight-logo.png" alt="Nestle Insight" className="h-11 w-auto" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#e1ba97]">
                  Nestle Insight
                </p>
                <p className="mt-1 text-sm text-[#e9d7cb]">Territory Manager Portal</p>
              </div>
            </div>
          </div>

          {/* Main navigation */}
          <nav className="mt-8 flex flex-col gap-1">
            {mainNavItems.map((item) => {
              const isActive = activeSection === item.key
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
                    <NavIcon section={item.key} />
                  </span>
                  <span className="block truncate text-[0.97rem] font-semibold">
                    {item.label}
                  </span>
                  {item.key === 'approvals' && pendingCounts?.approvals ? (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[#d7965f] px-1.5 text-xs font-bold text-white">
                      {pendingCounts.approvals > 99 ? '99+' : pendingCounts.approvals}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </nav>

          {/* Bottom: settings */}
          <div className="mt-auto flex flex-col gap-1 pt-6 border-t border-white/10">
            {bottomNavItems.map((item) => {
              const isActive = activeSection === item.key
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
                    <NavIcon section={item.key} />
                  </span>
                  <span className="block truncate text-[0.97rem] font-semibold">
                    {item.label}
                  </span>
                </button>
              )
            })}

            {/* User card */}
            <div className="mt-3 rounded-[1.5rem] border border-white/12 bg-white/6 px-4 py-4 text-left backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#d7965f] to-[#b86d35] text-sm font-bold text-white">
                  {user.firstName.charAt(0).toUpperCase()}
                  {user.lastName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#fff6ee]">{user.username}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#dcc7b8]">
                    Territory Manager
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

        {/* Main content */}
        <main className="relative flex-1 overflow-hidden bg-white">
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
