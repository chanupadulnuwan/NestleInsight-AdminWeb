import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import type { AuthUser } from '../api/auth'
import { getApiErrorMessage } from '../api/client'
import { approvePendingUser, fetchPendingUsers, rejectPendingUser } from '../api/users'
import { useAuth } from '../context/AuthContext'

type AdminSection = 'dashboard' | 'approvals' | 'orders' | 'stocks'

const surfaceClassName =
  'rounded-[1.8rem] border border-[#ebdfd5] bg-white shadow-[0_20px_48px_rgba(59,31,15,0.08)]'

const navigationItems: Array<{ key: AdminSection; label: string }> = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'approvals', label: 'Approvals' },
  { key: 'orders', label: 'Orders' },
  { key: 'stocks', label: 'Stocks' },
]

const dashboardModules = [
  {
    badge: 'User Controls',
    title: 'Users',
    description: 'Manage web access, role approvals, and account activity.',
    action: 'Open user management',
    className: 'bg-gradient-to-br from-[#a9624f] via-[#9a5545] to-[#814035]',
    route: '/admin/users',
  },
  {
    badge: 'Catalog',
    title: 'Products',
    description: 'Maintain product records, pricing context, and visibility.',
    action: 'Open product catalog',
    className: 'bg-gradient-to-br from-[#a55f72] via-[#96566d] to-[#7c445f]',
    route: '/admin/products',
  },
  {
    badge: 'Coverage',
    title: 'Territories',
    description: 'Organize region ownership and territory alignment.',
    action: 'Open territory controls',
    className: 'bg-gradient-to-br from-[#9662a2] via-[#885594] to-[#73457f]',
    route: '/admin/territories',
  },
  {
    badge: 'Storage',
    title: 'Warehouses',
    description: 'Review locations, linked inventory hubs, and readiness.',
    action: 'Open warehouse overview',
    className: 'bg-gradient-to-br from-[#6d62a5] via-[#5f5896] to-[#4d4a84]',
    route: '/admin/warehouses',
  },
  {
    badge: 'Fleet',
    title: 'Assign Vehicles',
    description: 'View all registered vehicles, their warehouse links, and dispatch capacity.',
    action: 'Open fleet assignments',
    className: 'bg-gradient-to-br from-[#5f7ea4] via-[#547291] to-[#47617d]',
    route: '/admin/warehouses',
  },
  {
    badge: 'Campaigns',
    title: 'Promotions',
    description: 'Manage offers, campaign visibility, and promotional activity.',
    action: 'Open promotions',
    className: 'bg-gradient-to-br from-[#7a8a4a] via-[#6b7b3e] to-[#596832]',
    route: null,
  },
]

function formatPortalDate(value: string | null) {
  if (!value) {
    return 'Not available'
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleString()
}

function formatRoleLabel(role: AuthUser['role']) {
  return role
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatAccountStatus(status: AuthUser['accountStatus']) {
  if (status === 'OTP_PENDING') {
    return 'Pending OTP'
  }

  if (status === 'SUSPENDED') {
    return 'Deactivated'
  }

  return status.charAt(0) + status.slice(1).toLowerCase()
}

function formatApprovalStatus(status: AuthUser['approvalStatus']) {
  return status.charAt(0) + status.slice(1).toLowerCase()
}

function getUserInitials(user: AuthUser) {
  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.trim().toUpperCase()
  return initials || user.username.charAt(0).toUpperCase()
}

function NavGlyph({ name }: { name: AdminSection }) {
  if (name === 'dashboard') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="3.5" width="7" height="5" rx="1.5" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="10.5" width="7" height="10" rx="1.5" />
      </svg>
    )
  }

  if (name === 'approvals') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M8 4.5h8" />
        <path d="M8.5 3.5h7a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z" />
        <path d="m9 12 2.1 2.2L15.5 10" />
      </svg>
    )
  }

  if (name === 'orders') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6.5 7.5h11l-1 10h-9Z" />
        <path d="M9 7.5a3 3 0 0 1 6 0" />
        <path d="M8 12h8" />
      </svg>
    )
  }

  if (name === 'stocks') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m4 8 8-4 8 4-8 4Z" />
        <path d="m4 12 8 4 8-4" />
        <path d="m4 16 8 4 8-4" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3.5v2.1" />
      <path d="M12 18.4v2.1" />
      <path d="m5.9 5.9 1.5 1.5" />
      <path d="m16.6 16.6 1.5 1.5" />
      <path d="M3.5 12h2.1" />
      <path d="M18.4 12h2.1" />
      <path d="m5.9 18.1 1.5-1.5" />
      <path d="m16.6 7.4 1.5-1.5" />
      <circle cx="12" cy="12" r="3.2" />
    </svg>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, isAuthLoading, logout, refreshSession } = useAuth()
  const [pendingUsers, setPendingUsers] = useState<AuthUser[]>([])
  const [isPendingLoading, setIsPendingLoading] = useState(false)
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rejectionNotes, setRejectionNotes] = useState<Record<string, string>>({})
  const [actionUserId, setActionUserId] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard')

  const isAdmin = user?.role === 'ADMIN'
  const isRegionalManager = user?.role === 'REGIONAL_MANAGER'
  const isRegionalManagerApproved =
    isRegionalManager && user?.approvalStatus === 'APPROVED'
  const regionalManagerModules = dashboardModules.filter(
    (module) =>
      module.route === '/admin/territories' ||
      module.route === '/admin/warehouses',
  )

  const syncSection = (section: AdminSection) => {
    setActiveSection(section)
    setSearchParams(section === 'dashboard' ? {} : { section })
  }

  const refreshPendingUsers = async () => {
    setIsPendingLoading(true)
    setError(null)

    try {
      const response = await fetchPendingUsers()
      setPendingUsers(response.users)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to load pending approvals right now.'))
    } finally {
      setIsPendingLoading(false)
    }
  }

  useEffect(() => {
    if (!isAdmin) {
      return
    }

    void refreshPendingUsers()
  }, [isAdmin])

  useEffect(() => {
    const sectionParam = searchParams.get('section')
    const nextSection = navigationItems.find((item) => item.key === sectionParam)?.key ?? 'dashboard'

    if (nextSection !== activeSection) {
      setActiveSection(nextSection)
    }
  }, [activeSection, searchParams])

  if (isAuthLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-white text-[#6e5647]">Loading admin portal...</div>
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  if (user.role === 'REGIONAL_MANAGER') {
    return <Navigate to="/tm/warehouse" replace />
  }

  const handleApprove = async (userId: string) => {
    setActionUserId(userId)
    setFeedback(null)
    setError(null)

    try {
      const response = await approvePendingUser(userId)
      setFeedback(response.message)
      await refreshPendingUsers()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to approve this request right now.'))
    } finally {
      setActionUserId(null)
    }
  }

  const handleReject = async (userId: string) => {
    const rejectionReason = rejectionNotes[userId]?.trim()

    if (!rejectionReason) {
      setError('Enter a rejection reason before rejecting the request.')
      setActiveSection('approvals')
      return
    }

    setActionUserId(userId)
    setFeedback(null)
    setError(null)

    try {
      const response = await rejectPendingUser(userId, rejectionReason)
      setFeedback(response.message)
      setRejectionNotes((current) => ({ ...current, [userId]: '' }))
      await refreshPendingUsers()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to reject this request right now.'))
    } finally {
      setActionUserId(null)
    }
  }

  const handleRefreshStatus = async () => {
    setIsRefreshingStatus(true)
    setError(null)
    setFeedback(null)

    try {
      const refreshedUser = await refreshSession()
      if (!refreshedUser) {
        setError('Unable to refresh the current account status right now.')
        return
      }

      setFeedback(
        refreshedUser.approvalStatus === 'APPROVED'
          ? 'Your account approval is active. The territory workspace is ready.'
          : 'Your account status is still waiting for admin approval.',
      )
    } catch {
      setError('Unable to refresh the current account status right now.')
    } finally {
      setIsRefreshingStatus(false)
    }
  }

  const sectionDetails: Record<AdminSection, { breadcrumb: string; title: string; description: string }> = {
    dashboard: {
      breadcrumb: isAdmin ? 'Portal / Dashboard' : 'Portal / Workspace',
      title: isAdmin
        ? 'Admin Dashboard'
        : isRegionalManagerApproved
          ? 'Territory Manager Dashboard'
          : 'Account Status Dashboard',
      description: isAdmin
        ? 'Manage users, products, territories, warehouses, and vehicle assignments from one clean control center.'
        : isRegionalManagerApproved
          ? 'Open the territory and warehouse workspace from the same portal shell used by the admin team.'
          : 'Your account has completed OTP verification and is now waiting for administrator approval.',
    },
    approvals: {
      breadcrumb: 'Portal / Approvals',
      title: 'Approvals',
      description: isAdmin
        ? 'Review and action pending web portal requests for territory and regional teams.'
        : isRegionalManagerApproved
          ? 'Your web account approval is active.'
          : 'Administrator approval is still required before the full territory workspace becomes active.',
    },
    orders: {
      breadcrumb: 'Portal / Orders',
      title: 'Orders',
      description: 'Track order flow and keep space ready for future admin order modules.',
    },
    stocks: {
      breadcrumb: 'Portal / Stocks',
      title: 'Stocks',
      description: 'Follow inventory visibility, warehouse readiness, and stock movement checkpoints.',
    },
  }

  const activeView = sectionDetails[activeSection]
  const pendingLabel = isPendingLoading ? 'Loading...' : `${pendingUsers.length} pending`

  let content = null

  if (activeSection === 'dashboard') {
    content = isAdmin ? (
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {dashboardModules.map((module) => (
            <button
              key={module.title}
              type="button"
              onClick={() => {
                if (module.route) {
                  navigate(module.route)
                }
              }}
              className={`relative overflow-hidden rounded-[1.8rem] text-left text-white shadow-[0_22px_54px_rgba(64,30,15,0.18)] transition duration-300 hover:-translate-y-1 ${module.className} ${module.route ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.24),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(255,255,255,0.18),_transparent_26%)]" />
              <div className="relative flex min-h-[18rem] flex-col">
                <div className="px-5 pt-5">
                  <span className="rounded-[0.8rem] bg-[#f3b539] px-4 py-2 text-sm font-bold text-[#5a2e0d] shadow-[0_12px_30px_rgba(87,42,11,0.2)]">
                    {module.badge}
                  </span>
                </div>
                <div className="mt-auto px-5 pb-6 pt-12">
                  <h2 className="max-w-[12rem] text-[1.9rem] font-bold leading-tight tracking-[-0.03em]">{module.title}</h2>
                  <p className="mt-3 max-w-[16rem] text-sm leading-6 text-white/82">{module.description}</p>
                </div>
                <div className="border-t border-white/18 px-5 py-4 text-sm font-medium tracking-[0.03em] text-white/90">
                  {module.action}
                </div>
              </div>
            </button>
          ))}
      </section>
    ) : isRegionalManagerApproved ? (
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {regionalManagerModules.map((module) => (
          <button
            key={module.title}
            type="button"
            onClick={() => {
              if (module.route) {
                navigate(module.route)
              }
            }}
            className={`relative overflow-hidden rounded-[1.8rem] text-left text-white shadow-[0_22px_54px_rgba(64,30,15,0.18)] transition duration-300 hover:-translate-y-1 ${module.className}`}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.24),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(255,255,255,0.18),_transparent_26%)]" />
            <div className="relative flex min-h-[18rem] flex-col">
              <div className="px-5 pt-5">
                <span className="rounded-[0.8rem] bg-[#f3b539] px-4 py-2 text-sm font-bold text-[#5a2e0d] shadow-[0_12px_30px_rgba(87,42,11,0.2)]">
                  {module.badge}
                </span>
              </div>
              <div className="mt-auto px-5 pb-6 pt-12">
                <h2 className="max-w-[12rem] text-[1.9rem] font-bold leading-tight tracking-[-0.03em]">{module.title}</h2>
                <p className="mt-3 max-w-[16rem] text-sm leading-6 text-white/82">{module.description}</p>
              </div>
              <div className="border-t border-white/18 px-5 py-4 text-sm font-medium tracking-[0.03em] text-white/90">
                {module.action}
              </div>
            </div>
          </button>
        ))}
      </section>
    ) : (
      <section className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">Access Status</p>
        <h2 className="mt-3 text-[1.8rem] font-bold tracking-[-0.04em] text-[#4d3020]">Your account is waiting for admin approval</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[#7f6657]">
          OTP verification is complete. Once an administrator approves your account, this dashboard will unlock the territory and warehouse workspace.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[1.35rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4">
            <p className="text-sm font-semibold text-[#8a6c58]">Approval Status</p>
            <p className="mt-2 text-[1.2rem] font-bold text-[#4d3020]">{formatApprovalStatus(user.approvalStatus)}</p>
          </div>
          <div className="rounded-[1.35rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4">
            <p className="text-sm font-semibold text-[#8a6c58]">Account Status</p>
            <p className="mt-2 text-[1.2rem] font-bold text-[#4d3020]">{formatAccountStatus(user.accountStatus)}</p>
          </div>
          <div className="rounded-[1.35rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4">
            <p className="text-sm font-semibold text-[#8a6c58]">Territory</p>
            <p className="mt-2 text-[1.2rem] font-bold text-[#4d3020]">{user.territoryName ?? 'Not assigned yet'}</p>
          </div>
          <div className="rounded-[1.35rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4">
            <p className="text-sm font-semibold text-[#8a6c58]">Warehouse</p>
            <p className="mt-2 text-[1.2rem] font-bold text-[#4d3020]">{user.warehouseName ?? 'Not assigned yet'}</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleRefreshStatus()}
            disabled={isRefreshingStatus}
            className="rounded-[1rem] bg-[#8b5a3a] px-4 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-[#73492f] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isRefreshingStatus ? 'Checking status...' : 'Refresh approval status'}
          </button>
        </div>
      </section>
    )
  } else if (activeSection === 'approvals') {
    content = isAdmin ? (
      <div className="grid gap-6">
        <section className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">Approval Queue</p>
              <h2 className="mt-2 text-[1.75rem] font-bold tracking-[-0.04em] text-[#4d3020]">Pending web portal requests</h2>
              <p className="mt-3 text-sm leading-7 text-[#7f6657]">Review requests, add rejection notes, and keep the queue moving.</p>
            </div>
            <button
              type="button"
              onClick={() => void refreshPendingUsers()}
              className="rounded-[1rem] border border-[#d7baa3] bg-[#fff7f0] px-4 py-3 text-sm font-semibold text-[#6e4d3b] transition duration-300 hover:border-[#c9976f] hover:text-[#4d3020]"
            >
              Refresh queue
            </button>
          </div>

          {feedback ? <div className="mt-5 rounded-[1rem] border border-[#cfe2c8] bg-[#f3fbef] px-4 py-3 text-sm text-[#4d6c45]">{feedback}</div> : null}
          {error ? <div className="mt-5 rounded-[1rem] border border-[#ebc0bb] bg-[#fff2f1] px-4 py-3 text-sm text-[#92524b]">{error}</div> : null}
        </section>

        <section className="space-y-4">
          {isPendingLoading ? <div className={`${surfaceClassName} px-6 py-6 text-sm text-[#7f6657]`}>Loading pending requests...</div> : null}
          {!isPendingLoading && pendingUsers.length === 0 ? <div className={`${surfaceClassName} px-6 py-6 text-sm text-[#7f6657]`}>No pending approvals right now.</div> : null}
          {!isPendingLoading
            ? pendingUsers.map((pendingUser) => {
                const isWorking = actionUserId === pendingUser.id

                return (
                  <article key={pendingUser.id} className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-4">
                          <div className="flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full bg-[#f8e6d6] text-sm font-bold text-[#8b5632]">
                            {getUserInitials(pendingUser)}
                          </div>
                          <div>
                            <h3 className="text-[1.25rem] font-bold tracking-[-0.03em] text-[#4d3020]">{pendingUser.firstName} {pendingUser.lastName}</h3>
                            <p className="text-sm text-[#866958]">{formatRoleLabel(pendingUser.role)}</p>
                          </div>
                        </div>
                        <div className="grid gap-x-6 gap-y-2 text-sm leading-6 text-[#7f6657] sm:grid-cols-2">
                          <p><span className="font-semibold text-[#5c4030]">Email:</span> {pendingUser.email}</p>
                          <p><span className="font-semibold text-[#5c4030]">Telephone:</span> {pendingUser.phoneNumber}</p>
                          <p><span className="font-semibold text-[#5c4030]">Employee ID:</span> {pendingUser.employeeId ?? 'Not provided'}</p>
                          <p><span className="font-semibold text-[#5c4030]">Territory:</span> {pendingUser.territoryName ?? 'Not provided'}</p>
                          <p><span className="font-semibold text-[#5c4030]">Warehouse:</span> {pendingUser.warehouseName ?? 'Not provided'}</p>
                          <p><span className="font-semibold text-[#5c4030]">Username:</span> {pendingUser.username}</p>
                          <p><span className="font-semibold text-[#5c4030]">Submitted:</span> {formatPortalDate(pendingUser.createdAt)}</p>
                        </div>
                      </div>

                      <div className="w-full max-w-[24rem] space-y-3">
                        <textarea
                          value={rejectionNotes[pendingUser.id] ?? ''}
                          onChange={(event) => setRejectionNotes((current) => ({ ...current, [pendingUser.id]: event.target.value }))}
                          rows={3}
                          placeholder="Enter a rejection reason if needed"
                          className="w-full rounded-[1rem] border border-[#e6ccb8] bg-[#fffdfb] px-4 py-3 text-sm text-[#5a4435] outline-none transition duration-300 focus:border-[#cf9566]"
                        />
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => void handleApprove(pendingUser.id)}
                            disabled={isWorking}
                            className="rounded-[1rem] bg-[#8b5a3a] px-4 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-[#73492f] disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {isWorking ? 'Working...' : 'Approve'}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleReject(pendingUser.id)}
                            disabled={isWorking}
                            className="rounded-[1rem] border border-[#d7baa3] bg-white px-4 py-3 text-sm font-semibold text-[#6e4d3b] transition duration-300 hover:border-[#c9976f] hover:text-[#4d3020] disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })
            : null}
        </section>
      </div>
    ) : (
      <section className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">
          {isRegionalManagerApproved ? 'Approval Active' : 'Awaiting Review'}
        </p>
        <h2 className="mt-3 text-[1.75rem] font-bold tracking-[-0.04em] text-[#4d3020]">
          {isRegionalManagerApproved
            ? 'Your administrator approval is complete'
            : 'Administrator approval is still required'}
        </h2>
        <p className="mt-3 text-sm leading-7 text-[#7f6657]">
          {isRegionalManagerApproved
            ? 'Your territory workspace is active. You can now open the territory and warehouse sections from the dashboard.'
            : 'New web accounts remain here until an administrator reviews them.'}
        </p>
        {!isRegionalManagerApproved ? (
          <div className="mt-5">
            <button
              type="button"
              onClick={() => void handleRefreshStatus()}
              disabled={isRefreshingStatus}
              className="rounded-[1rem] border border-[#d7baa3] bg-white px-4 py-3 text-sm font-semibold text-[#6e4d3b] transition duration-300 hover:border-[#c9976f] hover:text-[#4d3020] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isRefreshingStatus ? 'Checking status...' : 'Refresh approval status'}
            </button>
          </div>
        ) : null}
      </section>
    )
  } else if (activeSection === 'orders') {
    content = (
      <section className="grid gap-5 xl:grid-cols-2">
        <article className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">Order Flow</p>
          <h2 className="mt-3 text-[1.75rem] font-bold tracking-[-0.04em] text-[#4d3020]">Orders workspace structure is in place</h2>
          <div className="mt-5 space-y-3 text-sm leading-7 text-[#7f6657]">
            <div className="rounded-[1.3rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4">New order approvals can land in this panel next.</div>
            <div className="rounded-[1.3rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4">Dispatch planning and returns can share the same layout.</div>
          </div>
        </article>
        <article className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">Quick Snapshot</p>
          <div className="mt-5 grid gap-4">
            <div className="rounded-[1.35rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4"><p className="text-sm font-semibold text-[#8a6c58]">Priority queue</p><p className="mt-2 text-[1.55rem] font-bold text-[#4d3020]">24 orders</p></div>
            <div className="rounded-[1.35rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4"><p className="text-sm font-semibold text-[#8a6c58]">Dispatch windows</p><p className="mt-2 text-[1.55rem] font-bold text-[#4d3020]">06 active</p></div>
          </div>
        </article>
      </section>
    )
  } else if (activeSection === 'stocks') {
    content = (
      <section className="grid gap-5 xl:grid-cols-2">
        <article className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">Inventory Control</p>
          <h2 className="mt-3 text-[1.75rem] font-bold tracking-[-0.04em] text-[#4d3020]">Stocks area is ready for real inventory modules</h2>
          <p className="mt-4 text-sm leading-7 text-[#7f6657]">This section keeps room for warehouse stock tables, low-stock alerts, and dispatch visibility.</p>
        </article>
        <article className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">Warehouse Signals</p>
          <div className="mt-5 grid gap-4">
            <div className="rounded-[1.35rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4"><p className="text-sm font-semibold text-[#8a6c58]">Warehouse health</p><p className="mt-2 text-[1.4rem] font-bold text-[#4d3020]">Stable</p></div>
            <div className="rounded-[1.35rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4"><p className="text-sm font-semibold text-[#8a6c58]">Replenishment</p><p className="mt-2 text-[1.4rem] font-bold text-[#4d3020]">Queued</p></div>
          </div>
        </article>
      </section>
    )
  }

  return (
    <div className="min-h-screen bg-white text-[#1e130c]">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="flex w-full shrink-0 flex-col bg-[linear-gradient(180deg,#341d12_0%,#24130c_48%,#1a0d08_100%)] px-5 py-6 text-[#fff6ee] lg:sticky lg:top-0 lg:h-screen lg:w-[18.75rem] lg:px-6 lg:pt-7 lg:pb-8">
          <div className="border-b border-white/10 pb-6">
            <div className="flex items-center gap-3">
              <div className="rounded-[1rem] bg-white/10 p-2.5 shadow-[0_16px_34px_rgba(0,0,0,0.18)]">
                <img src="/images/insight-logo.png" alt="Nestle Insight" className="h-11 w-auto" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#e1ba97]">Nestle Insight</p>
                <p className="mt-1 text-sm text-[#e9d7cb]">
                  {isAdmin
                    ? 'Admin Portal'
                    : isRegionalManagerApproved
                      ? 'Territory Manager Portal'
                      : 'Approval Status Portal'}
                </p>
              </div>
            </div>
          </div>

          <nav className="mt-8 flex flex-1 flex-col gap-2">
            {navigationItems.map((item) => {
              const isActive = activeSection === item.key
              const showApprovalCount = item.key === 'approvals' && isAdmin

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => syncSection(item.key)}
                  className={`flex items-center gap-3 rounded-[1.35rem] px-3 py-3 text-left transition duration-300 ${isActive ? 'bg-white/12 shadow-[0_18px_34px_rgba(0,0,0,0.12)]' : 'hover:bg-white/8'}`}
                >
                  <span className={`flex h-11 w-11 items-center justify-center rounded-[1rem] border ${isActive ? 'border-[#d7a77e]/55 bg-white/10 text-[#ffd8b0]' : 'border-white/10 bg-black/10 text-[#f2ddca]'}`}>
                    <NavGlyph name={item.key} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.97rem] font-semibold text-[#fff6ee]">{item.label}</span>
                    {showApprovalCount ? <span className="mt-0.5 block text-xs text-[#dbc5b5]">{pendingLabel}</span> : null}
                  </span>
                  {showApprovalCount && pendingUsers.length > 0 ? <span className="rounded-full bg-[#f3b539] px-2 py-1 text-xs font-bold text-[#5a2e0d]">{pendingUsers.length}</span> : null}
                </button>
              )
            })}
          </nav>

          <div className="mt-auto flex flex-col gap-1 border-t border-white/10 pt-6">
            <button
              type="button"
              onClick={() => navigate('/admin/settings')}
              className="flex items-center gap-3 rounded-[1.35rem] px-3 py-3 text-left text-[#e0cdc1] transition duration-200 hover:bg-white/8 hover:text-white"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-[1rem] border border-white/10 bg-black/10 text-[#f2ddca]">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </span>
              <span className="block truncate text-[0.97rem] font-semibold">Settings</span>
            </button>

            <div className="mt-1 rounded-[1.5rem] border border-white/12 bg-white/6 px-4 py-4 backdrop-blur-sm">
              <button
                type="button"
                onClick={() => navigate('/admin/profile')}
                className="flex w-full items-center gap-3 text-left"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#d7965f] to-[#b86d35] text-sm font-bold text-white">
                  {getUserInitials(user)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#fff6ee]">{user.username}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#dcc7b8]">{formatRoleLabel(user.role)}</p>
                </div>
              </button>
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
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#a37d63]">{activeView.breadcrumb}</p>
                  <h1 className="mt-3 text-[2.2rem] font-bold tracking-[-0.05em] text-[#342015] sm:text-[2.7rem]">{activeView.title}</h1>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-[#7f6657] sm:text-[1rem]">{activeView.description}</p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {isAdmin && activeSection !== 'approvals' ? (
                    <button
                      type="button"
                      onClick={() => syncSection('approvals')}
                      className="rounded-[1rem] bg-[#879f33] px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(115,141,44,0.18)] transition duration-300 hover:bg-[#74892d]"
                    >
                      View approvals
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void logout()}
                    className="rounded-[1rem] bg-[#8b5a3a] px-4 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-[#73492f]"
                  >
                    Log out
                  </button>
                </div>
              </div>
            </section>

            {content}
          </div>
        </main>
      </div>
    </div>
  )
}
