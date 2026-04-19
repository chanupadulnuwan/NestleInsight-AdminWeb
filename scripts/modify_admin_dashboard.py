import sys

file_path = 'c:/NestleInsight/nestleinsight-adminweb/src/pages/AdminDashboard.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

def find_line(pattern, start_index=0):
    for i in range(start_index, len(lines)):
        if pattern in lines[i]:
            return i
    return -1

# 1. Add Imports
lines.insert(5, "import { fetchPendingOutlets, reviewOutlet } from '../api/outlets'\n")
lines.insert(6, "import type { Outlet } from '../api/outlets'\n")

# 2. Add States and Types
start_idx = find_line('export default function AdminDashboard() {')
# Add states after start_idx + 4 (around pendingUsers)
lines.insert(start_idx + 12, "  const [subTab, setSubTab] = useState<'users' | 'outlets'>('users')\n")
lines.insert(start_idx + 13, "  const [pendingOutlets, setPendingOutlets] = useState<Outlet[]>([])\n")
lines.insert(start_idx + 14, "  const [isOutletsLoading, setIsOutletsLoading] = useState(false)\n")
lines.insert(start_idx + 15, "  const [outletsError, setOutletsError] = useState<string | null>(null)\n")
lines.insert(start_idx + 16, "  const [reviewingOutletId, setReviewingOutletId] = useState<string | null>(null)\n")
lines.insert(start_idx + 17, "  const [outletRejectionTarget, setOutletRejectionTarget] = useState<Outlet | null>(null)\n")
lines.insert(start_idx + 18, "  const [outletMessage, setOutletMessage] = useState<string | null>(null)\n")
lines.insert(start_idx + 19, "  const [outletRejectionReason, setOutletRejectionReason] = useState('')\n")

# 3. Add loadOutlets and handleReviewOutlet functions
# Find refreshPendingUsers and add loadOutlets after it
refresh_pending_end = find_line('setIsPendingLoading(false)')
while '}' not in lines[refresh_pending_end]:
    refresh_pending_end += 1
refresh_pending_end += 1

load_outlets_code = """
  const loadOutlets = async () => {
    setIsOutletsLoading(true)
    setOutletsError(null)

    try {
      const response = await fetchPendingOutlets()
      setPendingOutlets(response.outlets)
    } catch (requestError) {
      setOutletsError(getApiErrorMessage(requestError, 'Unable to load pending outlet registrations.'))
    } finally {
      setIsOutletsLoading(false)
    }
  }
"""
lines.insert(refresh_pending_end + 1, load_outlets_code)

# Add handleReviewOutlet after handleReject
handle_reject_end = find_line('const handleReject = async')
while '}' not in lines[handle_reject_end]:
    handle_reject_end += 1
# Need to find the end of handleReject function block properly
brace_count = 1
i = handle_reject_end
while i < len(lines) and brace_count > 0:
    i += 1
    brace_count += lines[i].count('{')
    brace_count -= lines[i].count('}')
handle_reject_entire_end = i + 1

handle_review_outlet_code = """
  const handleReviewOutlet = async (
    outletId: string,
    decision: 'APPROVED' | 'REJECTED',
    reason?: string,
  ) => {
    setReviewingOutletId(outletId)
    setOutletMessage(null)

    try {
      const response = await reviewOutlet(outletId, {
        decision,
        rejectionReason: reason,
      })
      setOutletMessage(response.message)
      await loadOutlets()
    } catch (requestError) {
      setOutletMessage(getApiErrorMessage(requestError, 'Unable to review this outlet registration.'))
    } finally {
      setReviewingOutletId(null)
      setOutletRejectionTarget(null)
      setOutletRejectionReason('')
    }
  }
"""
lines.insert(handle_reject_entire_end + 1, handle_review_outlet_code)

# 4. Update useEffect to also pull outlets
use_effect_start = find_line('refreshPendingUsers()')
lines.insert(use_effect_start + 1, '    void loadOutlets()\n')

# 5. Update UI Header and Breadcrumb
# Add logic to clear feedback when switching tabs
sync_section_idx = find_line('setActiveSection(section)')
lines.insert(sync_section_idx + 2, '    setFeedback(null)\n    setError(null)\n    setOutletMessage(null)\n')

# 6. Update pendingLabel to count both
pending_label_idx = find_line('const pendingLabel = isPendingLoading')
lines[pending_label_idx] = "  const pendingLabel = isPendingLoading || isOutletsLoading ? 'Loading...' : `${pendingUsers.length + pendingOutlets.length} total approvals`\n"

# 7. Implement Sub-Tabs and Approval Content logic
# Find the start of activeSection === 'approvals'
approvals_content_idx = find_line("} else if (activeSection === 'approvals') {")
# We want to replace the whole content assignment logic
# Look for content = isAdmin ? (...) : (...)
content_start = find_line('content = isAdmin ? (', approvals_content_idx)

# Find the end of content = isAdmin ? (...) : (...) block
brace_count = 0
i = content_start
# Skip 'content = '
while 'isAdmin ? (' not in lines[i]: i += 1
brace_count = 1
i += 1
while i < len(lines) and brace_count > 0:
    brace_count += lines[i].count('(')
    brace_count -= lines[i].count(')')
    i += 1
content_end = i

new_approvals_content = """    content = isAdmin ? (
      <div className="grid gap-6">
        <section className={`${surfaceClassName} px-6 py-4 sm:px-7`}>
          <div className="flex gap-1 border-b border-[#ebdfd5]">
            <button
              type="button"
              onClick={() => setSubTab('users')}
              className={`px-5 py-3 text-sm font-semibold transition duration-300 ${subTab === 'users' ? 'border-b-2 border-[#8b5a3a] text-[#8b5a3a]' : 'text-[#a37d63] hover:text-[#8b5a3a]'}`}
            >
              Account Requests ({pendingUsers.length})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('outlets')}
              className={`px-5 py-3 text-sm font-semibold transition duration-300 ${subTab === 'outlets' ? 'border-b-2 border-[#8b5a3a] text-[#8b5a3a]' : 'text-[#a37d63] hover:text-[#8b5a3a]'}`}
            >
              Outlet Registrations ({pendingOutlets.length})
            </button>
          </div>
        </section>

        {subTab === 'users' ? (
          <>
            <section className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">Account Queue</p>
                  <h2 className="mt-2 text-[1.75rem] font-bold tracking-[-0.04em] text-[#4d3020]">Pending web portal requests</h2>
                  <p className="mt-2 text-sm text-[#7f6657]">New users awaiting role assignments and dashboard access.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void refreshPendingUsers()
                    setFeedback(null)
                    setError(null)
                  }}
                  className="rounded-[1rem] border border-[#d7baa3] bg-[#fff7f0] px-4 py-3 text-sm font-semibold text-[#6e4d3b] transition duration-300 hover:border-[#c9976f]"
                >
                  Refresh accounts
                </button>
              </div>
              {feedback ? <div className="mt-5 rounded-[1rem] border border-[#cfe2c8] bg-[#f3fbef] px-4 py-3 text-sm text-[#4d6c45]">{feedback}</div> : null}
              {error ? <div className="mt-5 rounded-[1rem] border border-[#ebc0bb] bg-[#fff2f1] px-4 py-3 text-sm text-[#92524b]">{error}</div> : null}
            </section>

            <section className="space-y-4">
              {isPendingLoading ? <div className={`${surfaceClassName} px-6 py-6 text-sm text-[#7f6657]`}>Loading pending user requests...</div> : null}
              {!isPendingLoading && pendingUsers.length === 0 ? <div className={`${surfaceClassName} px-6 py-6 text-sm text-[#7f6657]`}>No pending account requests right now.</div> : null}
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
                            <div className="grid gap-x-6 gap-y-2 text-sm text-[#7f6657] sm:grid-cols-2">
                              <p><span className="font-semibold text-[#5c4030]">Email:</span> {pendingUser.email}</p>
                              <p><span className="font-semibold text-[#5c4030]">Username:</span> {pendingUser.username}</p>
                              <p><span className="font-semibold text-[#5c4030]">Territory:</span> {pendingUser.territoryName ?? 'Not provided'}</p>
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
                                className="rounded-[1rem] bg-[#8b5a3a] px-4 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-[#73492f] disabled:opacity-70"
                              >
                                {isWorking ? 'Working...' : 'Approve User'}
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleReject(pendingUser.id)}
                                disabled={isWorking}
                                className="rounded-[1rem] border border-[#d7baa3] bg-white px-4 py-3 text-sm font-semibold text-[#6e4d3b] transition duration-300 hover:border-[#c9976f] hover:text-[#4d3020]"
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
          </>
        ) : (
          <>
            <section className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">Outlet Queue</p>
                  <h2 className="mt-2 text-[1.75rem] font-bold tracking-[-0.04em] text-[#4d3020]">Pending outlet registrations</h2>
                  <p className="mt-2 text-sm text-[#7f6657]">New shop locations registered by Sales Reps awaiting activation.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void loadOutlets()
                    setOutletMessage(null)
                    setOutletsError(null)
                  }}
                  className="rounded-[1rem] border border-[#d7baa3] bg-[#fff7f0] px-4 py-3 text-sm font-semibold text-[#6e4d3b] transition duration-300 hover:border-[#c9976f]"
                >
                  Refresh outlets
                </button>
              </div>
              {outletMessage ? <div className="mt-5 rounded-[1rem] border border-[#cfe2c8] bg-[#f3fbef] px-4 py-3 text-sm text-[#4d6c45]">{outletMessage}</div> : null}
              {outletsError ? <div className="mt-5 rounded-[1rem] border border-[#ebc0bb] bg-[#fff2f1] px-4 py-3 text-sm text-[#92524b]">{outletsError}</div> : null}
            </section>

            <section className="space-y-4">
              {isOutletsLoading ? <div className={`${surfaceClassName} px-6 py-6 text-sm text-[#7f6657]`}>Loading pending outlets...</div> : null}
              {!isOutletsLoading && pendingOutlets.length === 0 ? <div className={`${surfaceClassName} px-6 py-6 text-sm text-[#7f6657]`}>No pending outlet registrations right now.</div> : null}
              {!isOutletsLoading
                ? pendingOutlets.map((outlet) => (
                    <article key={outlet.id} className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
                      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                        <div className="space-y-3">
                          <h3 className="text-[1.25rem] font-bold tracking-[-0.03em] text-[#4d3020]">{outlet.outletName}</h3>
                          <div className="grid gap-x-6 gap-y-2 text-sm text-[#7f6657] sm:grid-cols-2">
                            <p><span className="font-semibold text-[#5c4030]">Owner:</span> {outlet.ownerName}</p>
                            <p><span className="font-semibold text-[#5c4030]">Contact:</span> {outlet.ownerPhone}</p>
                            <p className="sm:col-span-2"><span className="font-semibold text-[#5c4030]">Address:</span> {outlet.address}</p>
                            <p><span className="font-semibold text-[#5c4030]">Registered:</span> {new Date(outlet.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="w-full max-w-[24rem] space-y-3">
                          <div className="flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() => void handleReviewOutlet(outlet.id, 'APPROVED')}
                              disabled={reviewingOutletId === outlet.id}
                              className="rounded-[1rem] bg-[#8b5a3a] px-5 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-[#73492f] disabled:opacity-70"
                            >
                              {reviewingOutletId === outlet.id ? 'Approving...' : 'Approve Outlet'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setOutletRejectionTarget(outlet)}
                              className="rounded-[1rem] border border-[#e7c0bc] bg-[#fff0ef] px-5 py-3 text-sm font-semibold text-[#9b4b46] transition duration-300 hover:bg-[#ffe5e3]"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))
                : null}
            </section>
          </>
        )}
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
"""
# Replace the block
lines[content_start:content_end] = [new_approvals_content]

# 8. Add Outlet Rejection Modal Target (at the end of content)
# Find the return and wrap content
return_idx = find_line('return (')
# Insert modal before final outer div closing
lines.insert(-2, """
      {outletRejectionTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOutletRejectionTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-[2rem] border border-[#ebdfd5] bg-white p-8 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-[#4d3020]">Reject Outlet</h2>
            <p className="mt-2 text-sm text-[#7f6657]">
              Rejecting <strong>{outletRejectionTarget.outletName}</strong>
            </p>

            <label className="mt-5 flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#8a6c58]">
                Reason
              </span>
              <textarea
                rows={3}
                value={outletRejectionReason}
                onChange={(event) => setOutletRejectionReason(event.target.value)}
                placeholder="Explain why this outlet registration is being rejected..."
                className="rounded-[1rem] border border-[#e5d3c6] bg-[#fffdfb] px-4 py-3 text-sm text-[#452d1f] outline-none transition duration-300 focus:border-[#c99267]"
              />
            </label>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setOutletRejectionTarget(null)}
                className="flex-1 rounded-[1rem] border border-[#d7baa3] bg-white px-4 py-3 text-sm font-semibold text-[#6e4d3b] transition duration-300 hover:border-[#c9976f]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleReviewOutlet(outletRejectionTarget.id, 'REJECTED', outletRejectionReason)}
                disabled={reviewingOutletId !== null}
                className="flex-1 rounded-[1rem] bg-[#9b4b46] px-4 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-[#7f3d39] disabled:cursor-not-allowed"
              >
                {reviewingOutletId ? 'Saving...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
""")

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
