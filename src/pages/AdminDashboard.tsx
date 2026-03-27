import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import type { AuthUser } from '../api/auth'
import { getApiErrorMessage } from '../api/client'
import { approvePendingUser, fetchPendingUsers, rejectPendingUser } from '../api/users'
import { useAuth } from '../context/AuthContext'

function formatPortalDate(value: string | null) {
  if (!value) {
    return 'Not available'
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleString()
}

export default function AdminDashboard() {
  const { user, isAuthLoading, logout } = useAuth()
  const [pendingUsers, setPendingUsers] = useState<AuthUser[]>([])
  const [isPendingLoading, setIsPendingLoading] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rejectionNotes, setRejectionNotes] = useState<Record<string, string>>({})
  const [actionUserId, setActionUserId] = useState<string | null>(null)

  const isAdmin = user?.role === 'ADMIN'

  useEffect(() => {
    if (!isAdmin) {
      return
    }

    const loadPendingUsers = async () => {
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

    void loadPendingUsers()
  }, [isAdmin])

  if (isAuthLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#f7f1ea] text-[#6e5647]">Loading admin portal...</div>
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  const handleApprove = async (userId: string) => {
    setActionUserId(userId)
    setFeedback(null)
    setError(null)

    try {
      const response = await approvePendingUser(userId)
      setFeedback(response.message)
      const pendingResponse = await fetchPendingUsers()
      setPendingUsers(pendingResponse.users)
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
      return
    }

    setActionUserId(userId)
    setFeedback(null)
    setError(null)

    try {
      const response = await rejectPendingUser(userId, rejectionReason)
      setFeedback(response.message)
      setRejectionNotes((current) => ({ ...current, [userId]: '' }))
      const pendingResponse = await fetchPendingUsers()
      setPendingUsers(pendingResponse.users)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to reject this request right now.'))
    } finally {
      setActionUserId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f1ea] text-[#1e130c]">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[26rem] bg-[radial-gradient(circle_at_top_left,_rgba(240,182,126,0.24),_transparent_38%),linear-gradient(180deg,_#2a1209_0%,_#140704_74%,_rgba(20,7,4,0)_100%)]" />

        <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-10">
          <div className="flex items-center gap-4">
            <img src="/images/insight-logo.png" alt="Nestle Insight" className="h-auto w-[6.8rem] sm:w-[7.4rem]" />
            <div className="hidden sm:block">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#cfa781]">Admin Portal</p>
              <p className="text-sm text-[#d8c0af]">Connected to the same Nestle Insight backend and database</p>
            </div>
          </div>

          <button
            type="button"
            // Website auth update: allow the dashboard to clear the same shared session created by the modal login flow.
            onClick={() => void logout()}
            className="rounded-[1rem] border border-[#c89a73] bg-white/8 px-5 py-3 text-sm font-semibold text-[#f2e4d8] backdrop-blur-sm transition duration-300 hover:bg-white/12"
          >
            Log out
          </button>
        </header>

        <main className="relative z-10 mx-auto flex max-w-7xl flex-col gap-8 px-5 pb-14 pt-4 sm:px-8 lg:px-10">
          <section className="dark-panel rounded-[2rem] border border-white/10 px-6 py-7 text-[#fff4ea] sm:px-8 sm:py-9">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#efb782]">Dummy Dashboard</p>
            <h1 className="mt-4 max-w-3xl text-[2.4rem] font-[700] leading-[1.02] tracking-[-0.05em] sm:text-[3.2rem]">
              Welcome, {user.firstName}. Your web access is now live.
            </h1>
            <p className="mt-4 max-w-3xl text-[1rem] leading-8 text-[#dfc6b5] sm:text-[1.05rem]">
              This placeholder dashboard is already wired to the shared auth backend, OTP flow, and approval queue for
              the INSIGHT website.
            </p>
          </section>

          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <article className="soft-panel card-sheen rounded-[1.65rem] border border-[#ead7c9] px-5 py-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a37d63]">Role</p>
              <h2 className="mt-3 text-[1.5rem] font-bold text-[#5b4334]">{isAdmin ? 'Administrator' : 'Territory Manager'}</h2>
              <p className="mt-2 text-sm leading-6 text-[#8f7362]">Portal role currently signed in on the web system.</p>
            </article>

            <article className="soft-panel card-sheen rounded-[1.65rem] border border-[#ead7c9] px-5 py-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a37d63]">Portal Access</p>
              <h2 className="mt-3 text-[1.5rem] font-bold text-[#5b4334]">{user.platformAccess}</h2>
              <p className="mt-2 text-sm leading-6 text-[#8f7362]">Current account surface linked to this session.</p>
            </article>

            <article className="soft-panel card-sheen rounded-[1.65rem] border border-[#ead7c9] px-5 py-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a37d63]">Account Status</p>
              <h2 className="mt-3 text-[1.5rem] font-bold text-[#5b4334]">{user.accountStatus}</h2>
              <p className="mt-2 text-sm leading-6 text-[#8f7362]">OTP and approval status from the shared backend.</p>
            </article>

            <article className="soft-panel card-sheen rounded-[1.65rem] border border-[#ead7c9] px-5 py-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a37d63]">Forecast Workspace</p>
              <h2 className="mt-3 text-[1.5rem] font-bold text-[#5b4334]">Coming Soon</h2>
              <p className="mt-2 text-sm leading-6 text-[#8f7362]">This placeholder is ready for forecasting modules next.</p>
            </article>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
            <article className="soft-panel rounded-[1.8rem] border border-[#ead7c9] px-6 py-6 sm:px-7">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">Profile Snapshot</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div><p className="text-sm font-semibold text-[#8f7362]">Full name</p><p className="mt-1 text-lg font-semibold text-[#5b4334]">{user.firstName} {user.lastName}</p></div>
                <div><p className="text-sm font-semibold text-[#8f7362]">Username</p><p className="mt-1 text-lg font-semibold text-[#5b4334]">{user.username}</p></div>
                <div><p className="text-sm font-semibold text-[#8f7362]">Email</p><p className="mt-1 text-lg font-semibold text-[#5b4334]">{user.email}</p></div>
                <div><p className="text-sm font-semibold text-[#8f7362]">Telephone</p><p className="mt-1 text-lg font-semibold text-[#5b4334]">{user.phoneNumber}</p></div>
                <div><p className="text-sm font-semibold text-[#8f7362]">Employee ID</p><p className="mt-1 text-lg font-semibold text-[#5b4334]">{user.employeeId ?? 'Not provided'}</p></div>
                <div><p className="text-sm font-semibold text-[#8f7362]">Territory</p><p className="mt-1 text-lg font-semibold text-[#5b4334]">{user.warehouseName ?? 'Not assigned yet'}</p></div>
              </div>
            </article>

            <article className="soft-panel rounded-[1.8rem] border border-[#ead7c9] px-6 py-6 sm:px-7">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">Activation Timeline</p>
              <div className="mt-5 space-y-4 text-sm leading-7 text-[#7d6351]">
                <div><p className="font-semibold text-[#5b4334]">Created</p><p>{formatPortalDate(user.createdAt)}</p></div>
                <div><p className="font-semibold text-[#5b4334]">Approved by</p><p>{user.approvedBy ?? 'Self-service or not approved yet'}</p></div>
                <div><p className="font-semibold text-[#5b4334]">Approved at</p><p>{formatPortalDate(user.approvedAt)}</p></div>
                <div><p className="font-semibold text-[#5b4334]">OTP verified at</p><p>{formatPortalDate(user.otpVerifiedAt)}</p></div>
              </div>
            </article>
          </section>

          <section className="soft-panel rounded-[1.8rem] border border-[#ead7c9] px-6 py-6 sm:px-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">Approval Queue</p>
                <h2 className="mt-2 text-[1.7rem] font-bold tracking-[-0.04em] text-[#5b4334]">
                  {isAdmin ? 'Pending territory-manager access requests' : 'Admin approval is required for new territory-manager accounts'}
                </h2>
              </div>
              {isAdmin ? (
                <button
                  type="button"
                  onClick={async () => {
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
                  }}
                  className="rounded-[1rem] border border-[#dcb89b] bg-white px-4 py-3 text-sm font-semibold text-[#7a5e4c] transition duration-300 hover:border-[#c9966c] hover:text-[#5b4334]"
                >
                  Refresh queue
                </button>
              ) : null}
            </div>

            {feedback ? <div className="mt-5 rounded-[1rem] border border-[#cfe2c8] bg-[#f3fbef] px-4 py-3 text-sm text-[#4d6c45]">{feedback}</div> : null}
            {error ? <div className="mt-5 rounded-[1rem] border border-[#ebc0bb] bg-[#fff2f1] px-4 py-3 text-sm text-[#92524b]">{error}</div> : null}

            {!isAdmin ? (
              <div className="mt-6 rounded-[1.35rem] border border-dashed border-[#e5ccb6] bg-[#fffdfb] px-5 py-5 text-sm leading-7 text-[#886d5b]">
                Territory-manager accounts wait here until an administrator reviews them. After approval, the user logs in here and completes OTP verification.
              </div>
            ) : null}

            {isAdmin ? (
              <div className="mt-6 space-y-4">
                {isPendingLoading ? <div className="rounded-[1.35rem] border border-dashed border-[#e5ccb6] bg-[#fffdfb] px-5 py-5 text-sm leading-7 text-[#886d5b]">Loading pending requests...</div> : null}
                {!isPendingLoading && pendingUsers.length === 0 ? <div className="rounded-[1.35rem] border border-dashed border-[#e5ccb6] bg-[#fffdfb] px-5 py-5 text-sm leading-7 text-[#886d5b]">No pending approvals right now. New territory-manager signups will appear here automatically.</div> : null}

                {pendingUsers.map((pendingUser) => {
                  const isWorking = actionUserId === pendingUser.id

                  return (
                    <article key={pendingUser.id} className="rounded-[1.45rem] border border-[#ead7c9] bg-white px-5 py-5 shadow-[0_18px_38px_rgba(88,49,18,0.05)]">
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="space-y-2">
                          <h3 className="text-[1.2rem] font-bold text-[#5b4334]">{pendingUser.firstName} {pendingUser.lastName}</h3>
                          <div className="grid gap-1 text-sm leading-6 text-[#826858] sm:grid-cols-2">
                            <p>Email: {pendingUser.email}</p>
                            <p>Telephone: {pendingUser.phoneNumber}</p>
                            <p>Employee ID: {pendingUser.employeeId ?? 'Not provided'}</p>
                            <p>Territory: {pendingUser.warehouseName ?? 'Not provided'}</p>
                            <p>Username: {pendingUser.username}</p>
                            <p>Submitted: {formatPortalDate(pendingUser.createdAt)}</p>
                          </div>
                        </div>

                        <div className="w-full max-w-[22rem] space-y-3">
                          <textarea
                            value={rejectionNotes[pendingUser.id] ?? ''}
                            onChange={(event) => setRejectionNotes((current) => ({ ...current, [pendingUser.id]: event.target.value }))}
                            rows={3}
                            placeholder="Rejection reason if needed"
                            className="w-full rounded-[1rem] border border-[#e6ccb8] bg-[#fffdfb] px-4 py-3 text-sm text-[#5a4435] outline-none transition duration-300 focus:border-[#cf9566]"
                          />
                          <div className="flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() => void handleApprove(pendingUser.id)}
                              disabled={isWorking}
                              className="rounded-[1rem] bg-[#9a785f] px-4 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-[#876750] disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              {isWorking ? 'Working...' : 'Approve'}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleReject(pendingUser.id)}
                              disabled={isWorking}
                              className="rounded-[1rem] border border-[#dcb89b] bg-white px-4 py-3 text-sm font-semibold text-[#7a5e4c] transition duration-300 hover:border-[#c9966c] hover:text-[#5b4334] disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : null}
          </section>
        </main>
      </div>
    </div>
  )
}
