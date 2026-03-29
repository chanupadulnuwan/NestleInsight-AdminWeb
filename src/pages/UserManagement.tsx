import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import type { AuthUser } from '../api/auth'
import { getApiErrorMessage } from '../api/client'
import {
  approvePendingUser,
  fetchManageableUsers,
  fetchPendingUsers,
  rejectPendingUser,
  updateUserStatus,
} from '../api/users'
import { useAuth } from '../context/AuthContext'

type AdminSection = 'dashboard' | 'approvals' | 'orders' | 'stocks'
type ManageableRole = 'SHOP_OWNER' | 'TERRITORY_DISTRIBUTOR' | 'REGIONAL_MANAGER'
type PendingAction = 'REJECT' | 'DEACTIVATE' | null

const surfaceClassName =
  'rounded-[1.8rem] border border-[#ebdfd5] bg-white shadow-[0_20px_48px_rgba(59,31,15,0.08)]'

const navigationItems: Array<{ key: AdminSection; label: string }> = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'approvals', label: 'Approvals' },
  { key: 'orders', label: 'Orders' },
  { key: 'stocks', label: 'Stocks' },
]

const roleOptions: Array<{ value: 'ALL' | ManageableRole; label: string }> = [
  { value: 'ALL', label: 'All roles' },
  { value: 'SHOP_OWNER', label: 'Shop Owners' },
  { value: 'TERRITORY_DISTRIBUTOR', label: 'Territory Distributors' },
  { value: 'REGIONAL_MANAGER', label: 'Territory Managers' },
]

const roleLabels: Record<ManageableRole, string> = {
  SHOP_OWNER: 'Shop Owners',
  TERRITORY_DISTRIBUTOR: 'Territory Distributors',
  REGIONAL_MANAGER: 'Territory Managers',
}

function formatPortalDate(value: string | null) {
  if (!value) {
    return 'Not available'
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleString()
}

function formatRoleLabel(role: AuthUser['role']) {
  if (role === 'SHOP_OWNER' || role === 'TERRITORY_DISTRIBUTOR' || role === 'REGIONAL_MANAGER') {
    return roleLabels[role]
  }

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

function getStatusBadgeClass(status: AuthUser['accountStatus']) {
  if (status === 'PENDING' || status === 'OTP_PENDING') {
    return 'border border-[#f0c96d] bg-[#fff2c8] text-[#8c5d0d]'
  }

  if (status === 'ACTIVE') {
    return 'border border-[#8cb53a] bg-[#e7f5d7] text-[#3d7121]'
  }

  if (status === 'SUSPENDED') {
    return 'border border-[#e2a36b] bg-[#ffe7d2] text-[#a85c17]'
  }

  return 'border border-[#e08d8d] bg-[#ffe3e2] text-[#aa3535]'
}

function getActionButtonClass(action: 'APPROVE' | 'ACTIVATE' | 'DEACTIVATE' | 'REJECT') {
  if (action === 'APPROVE') {
    return 'rounded-[1rem] bg-[#e3b231] px-4 py-3 text-sm font-semibold text-[#4e2f10] transition duration-300 hover:bg-[#cf9f24] disabled:cursor-not-allowed disabled:opacity-70'
  }

  if (action === 'ACTIVATE') {
    return 'rounded-[1rem] bg-[#6fa132] px-4 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-[#5f8c2a] disabled:cursor-not-allowed disabled:opacity-70'
  }

  if (action === 'DEACTIVATE') {
    return 'rounded-[1rem] bg-[#d5883e] px-4 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-[#bd7330] disabled:cursor-not-allowed disabled:opacity-70'
  }

  return 'rounded-[1rem] bg-[#c84f4f] px-4 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-[#b63d3d] disabled:cursor-not-allowed disabled:opacity-70'
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

export default function UserManagement() {
  const navigate = useNavigate()
  const { user, isAuthLoading, logout } = useAuth()
  const [manageableUsers, setManageableUsers] = useState<AuthUser[]>([])
  const [pendingUsers, setPendingUsers] = useState<AuthUser[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)
  const [actionFeedback, setActionFeedback] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState<'ALL' | ManageableRole>('ALL')
  const [selectedUser, setSelectedUser] = useState<AuthUser | null>(null)
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [actionReason, setActionReason] = useState('')
  const [actionUserId, setActionUserId] = useState<string | null>(null)

  const isAdmin = user?.role === 'ADMIN'

  const loadPageData = async () => {
    setIsLoading(true)
    setPageError(null)

    try {
      const [manageableResponse, pendingResponse] = await Promise.all([
        fetchManageableUsers(),
        fetchPendingUsers(),
      ])
      setManageableUsers(manageableResponse.users)
      setPendingUsers(pendingResponse.users)
    } catch (requestError) {
      setPageError(getApiErrorMessage(requestError, 'Unable to load user management data right now.'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!isAdmin) {
      return
    }

    void loadPageData()
  }, [isAdmin])

  useEffect(() => {
    if (!actionFeedback && !actionError) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setActionFeedback(null)
      setActionError(null)
    }, 4000)

    return () => window.clearTimeout(timeoutId)
  }, [actionError, actionFeedback])

  if (isAuthLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-white text-[#6e5647]">Loading user management...</div>
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  if (!isAdmin) {
    return <Navigate to="/admin/dashboard" replace />
  }

  const goToSection = (section: AdminSection) => {
    navigate(section === 'dashboard' ? '/admin/dashboard' : `/admin/dashboard?section=${section}`)
  }

  const refreshAndSyncUser = async (updatedUser?: AuthUser) => {
    await loadPageData()

    if (updatedUser) {
      setSelectedUser(updatedUser)
    }
  }

  const runUserAction = async (action: 'APPROVE' | 'ACTIVATE' | 'DEACTIVATE' | 'REJECT') => {
    if (!selectedUser) {
      return
    }

    const requiresReason = action === 'DEACTIVATE' || action === 'REJECT'
    const trimmedReason = actionReason.trim()

    if (requiresReason && !trimmedReason) {
      setActionError('Enter a reason before confirming this status change.')
      return
    }

    setActionUserId(selectedUser.id)
    setActionFeedback(null)
    setActionError(null)

    try {
      let response: { message: string; user: AuthUser }

      if (action === 'APPROVE') {
        response = await approvePendingUser(selectedUser.id)
      } else if (action === 'ACTIVATE') {
        response = await updateUserStatus(selectedUser.id, { status: 'ACTIVE' })
      } else if (action === 'DEACTIVATE') {
        response = await updateUserStatus(selectedUser.id, { status: 'SUSPENDED', reason: trimmedReason })
      } else if (selectedUser.accountStatus === 'PENDING' && selectedUser.approvalStatus === 'PENDING') {
        response = await rejectPendingUser(selectedUser.id, trimmedReason)
      } else {
        response = await updateUserStatus(selectedUser.id, { status: 'REJECTED', reason: trimmedReason })
      }

      setActionFeedback(response.message)
      setPendingAction(null)
      setActionReason('')
      await refreshAndSyncUser(response.user)
    } catch (requestError) {
      setActionError(getApiErrorMessage(requestError, 'Unable to update this user right now.'))
    } finally {
      setActionUserId(null)
    }
  }

  const searchValue = searchTerm.trim().toLowerCase()
  const filteredUsers = manageableUsers.filter((candidate) => {
    const matchesRole = selectedRole === 'ALL' || candidate.role === selectedRole
    const haystack = `${candidate.firstName} ${candidate.lastName} ${candidate.username} ${candidate.email}`.toLowerCase()
    return matchesRole && (!searchValue || haystack.includes(searchValue))
  })

  const groupedUsers = roleOptions
    .filter((role) => role.value !== 'ALL')
    .filter((role) => selectedRole === 'ALL' || selectedRole === role.value)
    .map((role) => ({
      key: role.value as ManageableRole,
      label: role.label,
      users: filteredUsers.filter((candidate) => candidate.role === role.value),
    }))

  const detailRows: Array<[string, string]> = selectedUser
    ? [
        ['Full name', `${selectedUser.firstName} ${selectedUser.lastName}`.trim()],
        ['Username', selectedUser.username],
        ['Email', selectedUser.email],
        ['Phone number', selectedUser.phoneNumber],
        ...(selectedUser.publicUserCode ? [['User code', selectedUser.publicUserCode] as [string, string]] : []),
        ...(selectedUser.employeeId ? [['Employee ID', selectedUser.employeeId] as [string, string]] : []),
        ...(selectedUser.nic ? [['NIC', selectedUser.nic] as [string, string]] : []),
        ...(selectedUser.shopName ? [['Shop name', selectedUser.shopName] as [string, string]] : []),
        ...(selectedUser.address ? [['Address', selectedUser.address] as [string, string]] : []),
        ...(selectedUser.warehouseName ? [['Warehouse', selectedUser.warehouseName] as [string, string]] : []),
        ['Role', formatRoleLabel(selectedUser.role)],
        ['Platform access', selectedUser.platformAccess],
        ['Account status', formatAccountStatus(selectedUser.accountStatus)],
        ['Approval status', formatApprovalStatus(selectedUser.approvalStatus)],
        ...(selectedUser.approvedBy ? [['Approved by', selectedUser.approvedBy] as [string, string]] : []),
        ...(selectedUser.approvedAt ? [['Approved at', formatPortalDate(selectedUser.approvedAt)] as [string, string]] : []),
        ...(selectedUser.rejectionReason ? [['Rejection reason', selectedUser.rejectionReason] as [string, string]] : []),
        ['Email verified', selectedUser.isEmailVerified ? 'Yes' : 'No'],
        ...(selectedUser.otpVerifiedAt ? [['OTP verified at', formatPortalDate(selectedUser.otpVerifiedAt)] as [string, string]] : []),
        ['Created at', formatPortalDate(selectedUser.createdAt)],
      ]
    : []

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
                <p className="mt-1 text-sm text-[#e9d7cb]">Admin Portal</p>
              </div>
            </div>
          </div>

          <nav className="mt-8 flex flex-1 flex-col gap-2">
            {navigationItems.map((item) => {
              const isActive = item.key === 'dashboard'

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => goToSection(item.key)}
                  className={`flex items-center gap-3 rounded-[1.35rem] px-3 py-3 text-left transition duration-300 ${isActive ? 'bg-white/12 shadow-[0_18px_34px_rgba(0,0,0,0.12)]' : 'hover:bg-white/8'}`}
                >
                  <span className={`flex h-11 w-11 items-center justify-center rounded-[1rem] border ${isActive ? 'border-[#d7a77e]/55 bg-white/10 text-[#ffd8b0]' : 'border-white/10 bg-black/10 text-[#f2ddca]'}`}>
                    <NavGlyph name={item.key} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.97rem] font-semibold text-[#fff6ee]">{item.label}</span>
                    {item.key === 'approvals' ? <span className="mt-0.5 block text-xs text-[#dbc5b5]">{pendingUsers.length} pending</span> : null}
                  </span>
                </button>
              )
            })}
          </nav>

          <div className="mt-8 rounded-[1.5rem] border border-white/12 bg-white/6 px-4 py-4 backdrop-blur-sm lg:mt-auto">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#d7965f] to-[#b86d35] text-sm font-bold text-white">
                {getUserInitials(user)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#fff6ee]">{user.username}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#dcc7b8]">Admin</p>
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
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#a37d63]">Portal / Dashboard / User Management</p>
                  <h1 className="mt-3 text-[2.2rem] font-bold tracking-[-0.05em] text-[#342015] sm:text-[2.7rem]">User Management</h1>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-[#7f6657] sm:text-[1rem]">
                    Search users by name, username, or email, review approvals, and manage account status without showing admin records.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('/admin/dashboard')}
                    className="rounded-[1rem] bg-[#879f33] px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(115,141,44,0.18)] transition duration-300 hover:bg-[#74892d]"
                  >
                    Back to dashboard
                  </button>
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

            <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
              <article className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">Search And Filter</p>
                {pageError ? <div className="mt-5 rounded-[1rem] border border-[#ebc0bb] bg-[#fff2f1] px-4 py-3 text-sm text-[#92524b]">{pageError}</div> : null}
                <div className="mt-5 grid gap-4 md:grid-cols-[1fr_14rem]">
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search by name, username, or email"
                    className="rounded-[1rem] border border-[#e5d3c6] bg-[#fffdfb] px-4 py-3 text-sm text-[#452d1f] outline-none transition duration-300 focus:border-[#c99267]"
                  />
                  <select
                    value={selectedRole}
                    onChange={(event) => setSelectedRole(event.target.value as 'ALL' | ManageableRole)}
                    className="rounded-[1rem] border border-[#e5d3c6] bg-[#fffdfb] px-4 py-3 text-sm text-[#452d1f] outline-none transition duration-300 focus:border-[#c99267]"
                  >
                    {roleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-[1.35rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4">
                    <p className="text-sm font-semibold text-[#8a6c58]">Visible users</p>
                    <p className="mt-2 text-[1.55rem] font-bold text-[#4d3020]">{filteredUsers.length}</p>
                  </div>
                  <div className="rounded-[1.35rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4">
                    <p className="text-sm font-semibold text-[#8a6c58]">Pending approvals</p>
                    <p className="mt-2 text-[1.55rem] font-bold text-[#4d3020]">{pendingUsers.length}</p>
                  </div>
                  <div className="rounded-[1.35rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4">
                    <p className="text-sm font-semibold text-[#8a6c58]">Current filter</p>
                    <p className="mt-2 text-[1.55rem] font-bold text-[#4d3020]">{roleOptions.find((role) => role.value === selectedRole)?.label}</p>
                  </div>
                </div>
              </article>

              <article className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">Approval User Panel</p>
                    <h2 className="mt-2 text-[1.45rem] font-bold tracking-[-0.04em] text-[#4d3020]">Pending users</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadPageData()}
                    className="rounded-[1rem] border border-[#d7baa3] bg-[#fff7f0] px-4 py-3 text-sm font-semibold text-[#6e4d3b] transition duration-300 hover:border-[#c9976f] hover:text-[#4d3020]"
                  >
                    Refresh
                  </button>
                </div>
                <div className="mt-5 space-y-3">
                  {isLoading ? <div className="rounded-[1.2rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4 text-sm text-[#7f6657]">Loading users...</div> : null}
                  {!isLoading && pendingUsers.length === 0 ? <div className="rounded-[1.2rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4 text-sm text-[#7f6657]">No pending users right now.</div> : null}
                  {pendingUsers.map((pendingUser) => (
                    <button
                      key={pendingUser.id}
                      type="button"
                      onClick={() => {
                        setSelectedUser(pendingUser)
                        setPendingAction(null)
                        setActionReason('')
                        setActionFeedback(null)
                        setActionError(null)
                      }}
                      className="w-full rounded-[1.2rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4 text-left transition duration-300 hover:border-[#d7baa3]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-[#4d3020]">{pendingUser.firstName} {pendingUser.lastName}</p>
                          <p className="mt-1 text-sm text-[#7f6657]">{formatRoleLabel(pendingUser.role)}</p>
                        </div>
                        <span className={`rounded-full px-3 py-2 text-xs font-semibold ${getStatusBadgeClass(pendingUser.accountStatus)}`}>
                          {formatAccountStatus(pendingUser.accountStatus)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </article>
            </section>

            <section className="grid gap-5">
              {groupedUsers.map((group) => (
                <article key={group.key} className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">Role</p>
                      <h2 className="mt-2 text-[1.45rem] font-bold tracking-[-0.04em] text-[#4d3020]">{group.label}</h2>
                    </div>
                    <span className="rounded-full bg-[#fff4e8] px-3 py-2 text-sm font-semibold text-[#8b5a3a]">{group.users.length} users</span>
                  </div>

                  <div className="mt-5 grid gap-3">
                    {group.users.length === 0 ? (
                      <div className="rounded-[1.2rem] border border-dashed border-[#ead8ca] bg-[#fffdfb] px-4 py-4 text-sm text-[#7f6657]">
                        No users matched this search.
                      </div>
                    ) : null}

                    {group.users.map((managedUser) => (
                      <button
                        key={managedUser.id}
                        type="button"
                        onClick={() => {
                          setSelectedUser(managedUser)
                          setPendingAction(null)
                          setActionReason('')
                          setActionFeedback(null)
                          setActionError(null)
                        }}
                        className="flex flex-col gap-3 rounded-[1.2rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4 text-left transition duration-300 hover:border-[#d7baa3] md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <p className="text-[1.02rem] font-semibold text-[#4d3020]">{managedUser.firstName} {managedUser.lastName}</p>
                          <p className="mt-1 text-sm text-[#7f6657]">{managedUser.username} | {managedUser.email}</p>
                        </div>
                        <span className={`rounded-full px-3 py-2 text-sm font-semibold shadow-[0_8px_18px_rgba(84,46,22,0.08)] ${getStatusBadgeClass(managedUser.accountStatus)}`}>
                          {formatAccountStatus(managedUser.accountStatus)}
                        </span>
                      </button>
                    ))}
                  </div>
                </article>
              ))}
            </section>
          </div>
        </main>
      </div>

      {selectedUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#140704]/55 px-4 py-6">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[2rem] border border-[#e6d6ca] bg-white shadow-[0_30px_80px_rgba(33,13,6,0.24)]">
            <div className="flex items-start justify-between gap-4 border-b border-[#f0e4dc] px-6 py-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">User Details</p>
                <h2 className="mt-2 text-[1.9rem] font-bold tracking-[-0.04em] text-[#342015]">{selectedUser.firstName} {selectedUser.lastName}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <p className="text-sm text-[#7f6657]">{formatRoleLabel(selectedUser.role)}</p>
                  <span className={`rounded-full px-3 py-2 text-sm font-semibold ${getStatusBadgeClass(selectedUser.accountStatus)}`}>
                    {formatAccountStatus(selectedUser.accountStatus)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedUser(null)
                  setPendingAction(null)
                  setActionReason('')
                  setActionFeedback(null)
                  setActionError(null)
                }}
                className="rounded-[1rem] border border-[#dcc1ab] bg-[#fff6ee] px-4 py-3 text-sm font-semibold text-[#6e4d3b] transition duration-300 hover:border-[#c9976f] hover:text-[#4d3020]"
              >
                Close
              </button>
            </div>

            <div className="grid max-h-[calc(92vh-5.5rem)] gap-6 overflow-y-auto px-6 py-6 lg:grid-cols-[1.15fr_0.85fr]">
              <article className={`${surfaceClassName} px-5 py-5`}>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">All User Data</p>
                <div className="mt-4 overflow-hidden rounded-[1.2rem] border border-[#efe4dc]">
                  <table className="w-full border-collapse text-sm">
                    <tbody>
                      {detailRows.map(([label, value]) => (
                        <tr key={label} className="border-b border-[#f1e7e0] last:border-b-0">
                          <td className="w-[38%] bg-[#fff9f5] px-4 py-3 font-semibold text-[#5d4031]">{label}</td>
                          <td className="px-4 py-3 text-[#7f6657]">{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className={`${surfaceClassName} px-5 py-5`}>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">Status Actions</p>
                {actionFeedback ? <div className="mt-4 rounded-[1rem] border border-[#cfe2c8] bg-[#f3fbef] px-4 py-3 text-sm text-[#4d6c45]">{actionFeedback}</div> : null}
                {actionError ? <div className="mt-4 rounded-[1rem] border border-[#ebc0bb] bg-[#fff2f1] px-4 py-3 text-sm text-[#92524b]">{actionError}</div> : null}
                <div className="mt-4 flex flex-wrap gap-3">
                  {selectedUser.accountStatus === 'PENDING' && selectedUser.approvalStatus === 'PENDING' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void runUserAction('APPROVE')}
                        disabled={actionUserId === selectedUser.id}
                        className={getActionButtonClass('APPROVE')}
                      >
                        {actionUserId === selectedUser.id ? 'Working...' : 'Approve'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPendingAction('REJECT')
                          setActionReason('')
                        }}
                        disabled={actionUserId === selectedUser.id}
                        className={getActionButtonClass('REJECT')}
                      >
                        Reject
                      </button>
                    </>
                  ) : null}

                  {(selectedUser.accountStatus === 'SUSPENDED' || selectedUser.accountStatus === 'REJECTED') ? (
                    <button
                      type="button"
                      onClick={() => void runUserAction('ACTIVATE')}
                      disabled={actionUserId === selectedUser.id}
                      className={getActionButtonClass('ACTIVATE')}
                    >
                      {actionUserId === selectedUser.id ? 'Working...' : 'Activate'}
                    </button>
                  ) : null}

                  {(selectedUser.accountStatus === 'ACTIVE' || selectedUser.accountStatus === 'OTP_PENDING') ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setPendingAction('DEACTIVATE')
                          setActionReason('')
                        }}
                        disabled={actionUserId === selectedUser.id}
                        className={getActionButtonClass('DEACTIVATE')}
                      >
                        Deactivate
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPendingAction('REJECT')
                          setActionReason('')
                        }}
                        disabled={actionUserId === selectedUser.id}
                        className={getActionButtonClass('REJECT')}
                      >
                        Reject
                      </button>
                    </>
                  ) : null}
                </div>

                {pendingAction ? (
                  <div className="mt-5 rounded-[1.2rem] border border-[#ead8ca] bg-[#fff9f5] px-4 py-4">
                    <p className="text-sm font-semibold text-[#5d4031]">
                      {pendingAction === 'DEACTIVATE' ? 'Why are you deactivating this user?' : 'Why are you rejecting this user?'}
                    </p>
                    <textarea
                      value={actionReason}
                      onChange={(event) => setActionReason(event.target.value)}
                      rows={4}
                      placeholder="Enter the reason here"
                      className="mt-3 w-full rounded-[1rem] border border-[#e6ccb8] bg-white px-4 py-3 text-sm text-[#5a4435] outline-none transition duration-300 focus:border-[#cf9566]"
                    />
                    <div className="mt-3 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => void runUserAction(pendingAction)}
                        disabled={actionUserId === selectedUser.id}
                        className={getActionButtonClass(pendingAction)}
                      >
                        {actionUserId === selectedUser.id ? 'Working...' : 'Confirm'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPendingAction(null)
                          setActionReason('')
                        }}
                        className="rounded-[1rem] border border-[#d7baa3] bg-white px-4 py-3 text-sm font-semibold text-[#6e4d3b] transition duration-300 hover:border-[#c9976f] hover:text-[#4d3020]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}

                {selectedUser.rejectionReason ? (
                  <div className="mt-5 rounded-[1.2rem] border border-[#ebd5cf] bg-[#fff5f4] px-4 py-4 text-sm text-[#7b514a]">
                    <p className="font-semibold">Current reason</p>
                    <p className="mt-2 leading-6">{selectedUser.rejectionReason}</p>
                  </div>
                ) : null}
              </article>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
