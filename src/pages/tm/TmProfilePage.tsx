import { Navigate } from 'react-router-dom'
import { TerritoryManagerPortalShell } from '../../components/TerritoryManagerPortalShell'
import { useAuth } from '../../context/AuthContext'

const surfaceClass =
  'rounded-[1.8rem] border border-[#ebdfd5] bg-white shadow-[0_20px_48px_rgba(59,31,15,0.08)]'

function formatDate(value: string | null) {
  if (!value) {
    return 'Not available'
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleString()
}

export default function TmProfilePage() {
  const { user, isAuthLoading } = useAuth()

  if (!isAuthLoading && (!user || user.role !== 'REGIONAL_MANAGER')) {
    return <Navigate to="/" replace />
  }

  if (!user) {
    return null
  }

  const profileRows = [
    ['Full name', `${user.firstName} ${user.lastName}`.trim()],
    ['Username', user.username],
    ['Email', user.email],
    ['Phone', user.phoneNumber],
    ['Employee ID', user.employeeId ?? 'Not provided'],
    ['NIC', user.nic ?? 'Not provided'],
    ['Territory', user.territoryName ?? 'Not assigned yet'],
    ['Warehouse', user.warehouseName ?? 'Not assigned yet'],
    ['Approval', user.approvalStatus],
    ['Account status', user.accountStatus],
    ['Approved by', user.approvedBy ?? 'Not available'],
    ['Approved at', formatDate(user.approvedAt)],
    ['OTP verified at', formatDate(user.otpVerifiedAt)],
    ['Created at', formatDate(user.createdAt)],
  ]

  return (
    <TerritoryManagerPortalShell
      user={user}
      breadcrumb="Territory Manager · Profile"
      title="Profile"
      description="Review your portal identity, warehouse assignment, and approval details."
    >
      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <article className={`${surfaceClass} px-6 py-6 sm:px-7`}>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">
            Personal Details
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {profileRows.map(([label, value]) => (
              <div key={label}>
                <p className="text-sm font-semibold text-[#8f7362]">{label}</p>
                <p className="mt-1 text-lg font-semibold text-[#5b4334]">{value}</p>
              </div>
            ))}
          </div>
        </article>

        <article className={`${surfaceClass} px-6 py-6 sm:px-7`}>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">
            Assignment Snapshot
          </p>
          <div className="mt-5 grid gap-4">
            <div className="rounded-[1.35rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4">
              <p className="text-sm font-semibold text-[#8a6c58]">Territory coverage</p>
              <p className="mt-2 text-[1.35rem] font-bold text-[#4d3020]">
                {user.territoryName ?? 'Not assigned yet'}
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4">
              <p className="text-sm font-semibold text-[#8a6c58]">Managed warehouse</p>
              <p className="mt-2 text-[1.35rem] font-bold text-[#4d3020]">
                {user.warehouseName ?? 'Not assigned yet'}
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4">
              <p className="text-sm font-semibold text-[#8a6c58]">Portal access</p>
              <p className="mt-2 text-[1.35rem] font-bold text-[#4d3020]">
                {user.platformAccess}
              </p>
            </div>
          </div>
        </article>
      </section>
    </TerritoryManagerPortalShell>
  )
}
