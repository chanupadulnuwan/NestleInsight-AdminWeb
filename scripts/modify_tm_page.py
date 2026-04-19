import sys

file_path = 'c:/NestleInsight/nestleinsight-adminweb/src/pages/tm/TmApprovalsPage.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

def find_line(pattern, start_index=0):
    for i in range(start_index, len(lines)):
        if pattern in lines[i]:
            return i
    return -1

# 1. Add loadOutlets and update useEffect
load_users_end = find_line('fetchTmPendingUsers()')
while '}' not in lines[load_users_end]:
    load_users_end += 1
load_users_end += 1

load_outlets_code = """
  const loadOutlets = () => {
    setOutletsLoading(true)
    setOutletsError(null)

    fetchPendingOutlets()
      .then((response) => setPendingOutlets(response.outlets))
      .catch((requestError) => setOutletsError(getApiErrorMessage(requestError)))
      .finally(() => setOutletsLoading(false))
  }
"""

lines.insert(load_users_end + 1, load_outlets_code)

# Update useEffect (now shifted by the insertion)
use_effect_start = find_line('useEffect(() => {', load_users_end)
lines.insert(use_effect_start + 3, '    loadOutlets()\n')

# 2. Add handleReviewOutlet
handle_approve_end = find_line('const handleApproveUser')
while '}' not in lines[handle_approve_end]:
    handle_approve_end += 1
# Need to find the end of the handleApproveUser function block
brace_count = 1
i = handle_approve_end
while i < len(lines) and brace_count > 0:
    i += 1
    brace_count += lines[i].count('{')
    brace_count -= lines[i].count('}')
handle_approve_entire_end = i + 1

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
      loadOutlets()
    } catch (requestError) {
      setOutletMessage(getApiErrorMessage(requestError))
    } finally {
      setReviewingOutletId(null)
      setOutletRejectionTarget(null)
      setRejectionReason('')
    }
  }
"""
lines.insert(handle_approve_entire_end, handle_review_outlet_code)

# 3. Update UI Description and Pending Counts
desc_idx = find_line('description="Review pending account requests')
lines[desc_idx] = '      description="Review pending account requests and new outlet registrations under your warehouse, or process newly placed shop-owner orders."\n'
counts_idx = find_line('pendingCounts={{ approvals: orders.length + pendingUsers.length }}')
lines[counts_idx] = '      pendingCounts={{ approvals: orders.length + pendingUsers.length + pendingOutlets.length }}\n'

# 4. Update tab counts UI
pending_accts_idx = find_line('Pending Accounts')
# Find the end of that div
div_end = pending_accts_idx
while '</div>' not in lines[div_end]:
    div_end += 1
div_end += 1

pending_outlets_ui = """        <div className="rounded-[1.6rem] border border-[#ebdfd5] bg-[#fff8f2] px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a37d63]">
            Pending Outlets
          </p>
          <p className="mt-3 text-3xl font-bold text-[#4d3020]">{pendingOutlets.length}</p>
          <p className="mt-2 text-sm text-[#7f6657]">
            Newly registered outlets awaiting approval to be added to active visit beats.
          </p>
        </div>
"""
lines.insert(div_end, pending_outlets_ui)

# 5. Add tab button
tab_map_idx = find_line('{ key: \'users\', label: \'Account Approvals\', count: pendingUsers.length },')
lines.insert(tab_map_idx + 1, "          { key: 'outlets', label: 'Outlet Approvals', count: pendingOutlets.length },\n")

# 6. Add Outlet Approvals content block and Modal
# Find the end of {activeTab === 'users' ? (...) : null}
users_tab_idx = find_line('{activeTab === \'users\' ? (')
brace_count = 1
i = users_tab_idx
while i < len(lines) and brace_count > 0:
    i += 1
    brace_count += lines[i].count('(')
    brace_count -= lines[i].count(')')
users_tab_end = i + 1

outlet_content_code = """
      {activeTab === 'outlets' ? (
        <div className={surfaceClass}>
          {outletMessage ? (
            <p className="border-b border-[#ebdfd5] px-5 py-3 text-sm text-[#8b5a3a]">
              {outletMessage}
            </p>
          ) : null}
          {outletsLoading ? (
            <p className="px-5 py-10 text-center text-sm text-[#7f6657]">Loading...</p>
          ) : null}
          {outletsError ? (
            <p className="px-5 py-10 text-center text-sm text-red-600">{outletsError}</p>
          ) : null}
          {!outletsLoading && !outletsError ? (
            <div className="overflow-x-auto rounded-[1.8rem]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#ebdfd5] bg-[#fff8f2] text-xs uppercase tracking-wide text-[#8a6c58]">
                    <th className="px-5 py-3 text-left">Outlet Name</th>
                    <th className="px-5 py-3 text-left">Owner</th>
                    <th className="px-5 py-3 text-left">Address</th>
                    <th className="px-5 py-3 text-left">Registered</th>
                    <th className="px-5 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingOutlets.map((outlet) => (
                    <tr
                      key={outlet.id}
                      className="border-b border-[#f1e5db] last:border-0 hover:bg-[#fffaf7]"
                    >
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-[#4d3020]">{outlet.outletName}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-[#4d3020]">{outlet.ownerName}</p>
                        <p className="text-xs text-[#8a6c58]">{outlet.ownerPhone}</p>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-[#7f6657]">
                        <p className="max-w-[15rem] truncate">{outlet.address}</p>
                      </td>
                      <td className="px-5 py-3.5 text-[#7f6657]">
                        {new Date(outlet.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => void handleReviewOutlet(outlet.id, 'APPROVED')}
                            disabled={reviewingOutletId === outlet.id}
                            className="rounded-[1rem] bg-[#8b5a3a] px-3 py-2 text-xs font-semibold text-white transition duration-300 hover:bg-[#73492f] disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {reviewingOutletId === outlet.id ? 'Saving...' : 'Approve'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setOutletRejectionTarget(outlet)}
                            className="rounded-[1rem] border border-[#e7c0bc] bg-[#fff0ef] px-3 py-2 text-xs font-semibold text-[#9b4b46] transition duration-300 hover:bg-[#ffe5e3]"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {pendingOutlets.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-[#7f6657]">
                        No pending outlet registrations.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}

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
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
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
                onClick={() => void handleReviewOutlet(outletRejectionTarget.id, 'REJECTED', rejectionReason)}
                disabled={reviewingOutletId !== null}
                className="flex-1 rounded-[1rem] bg-[#9b4b46] px-4 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-[#7f3d39] disabled:cursor-not-allowed"
              >
                {reviewingOutletId ? 'Saving...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
"""
lines.insert(users_tab_end, outlet_content_code)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
