import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  approveTmUser,
  fetchTmOrderProcessingPreview,
  fetchTmOrders,
  fetchTmPendingUsers,
  processTmOrder,
  rejectTmUser,
  type TmOrder,
  type TmOrderProcessingPreview,
  type TmPendingUser,
} from '../../api/tm'
import { getApiErrorMessage } from '../../api/client'
import { TerritoryManagerPortalShell } from '../../components/TerritoryManagerPortalShell'
import { useAuth } from '../../context/AuthContext'
import { formatCurrency } from '../productsPage.helpers'

const surfaceClass =
  'rounded-[1.8rem] border border-[#ebdfd5] bg-white shadow-[0_20px_48px_rgba(59,31,15,0.08)]'

function roleLabel(role: string) {
  return role === 'TERRITORY_DISTRIBUTOR' ? 'Territory Distributor' : 'Shop Owner'
}

function RejectModal({
  user,
  onClose,
  onRejected,
}: {
  user: TmPendingUser
  onClose: () => void
  onRejected: (message: string) => void
}) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleReject = async () => {
    if (!reason.trim()) {
      setError('Please provide a rejection reason.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const response = await rejectTmUser(user.id, reason.trim())
      onRejected(response.message)
      onClose()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[2rem] border border-[#ebdfd5] bg-white p-8 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-[#4d3020]">Reject account</h2>
        <p className="mt-2 text-sm text-[#7f6657]">
          Rejecting <strong>{user.firstName} {user.lastName}</strong> ({roleLabel(user.role)})
        </p>

        <label className="mt-5 flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#8a6c58]">
            Reason
          </span>
          <textarea
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Explain why this account is being rejected..."
            className="rounded-[1rem] border border-[#e5d3c6] bg-[#fffdfb] px-4 py-3 text-sm text-[#452d1f] outline-none transition duration-300 focus:border-[#c99267] focus:ring-2 focus:ring-[#f1dac9]"
          />
        </label>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-[1rem] border border-[#d7baa3] bg-white px-4 py-3 text-sm font-semibold text-[#6e4d3b] transition duration-300 hover:border-[#c9976f] hover:text-[#4d3020]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleReject()}
            disabled={saving}
            className="flex-1 rounded-[1rem] bg-[#9b4b46] px-4 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-[#7f3d39] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? 'Rejecting...' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ProcessOrderModal({
  order,
  onClose,
  onProcessed,
}: {
  order: TmOrder
  onClose: () => void
  onProcessed: (message: string) => void
}) {
  const [preview, setPreview] = useState<TmOrderProcessingPreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingAction, setSavingAction] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    fetchTmOrderProcessingPreview(order.id)
      .then((response) => {
        if (!isMounted) return
        setPreview(response.preview)
      })
      .catch((requestError) => {
        if (!isMounted) return
        setError(getApiErrorMessage(requestError))
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [order.id])

  const handleProcess = async (
    decision: 'READY_TO_DELIVER' | 'PROCEED_AVAILABLE' | 'CANCEL_ORDER',
  ) => {
    setSavingAction(decision)
    setError(null)

    try {
      const response = await processTmOrder(order.id, {
        decision,
      })
      onProcessed(response.message)
      onClose()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setSavingAction(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-[#ebdfd5] bg-white p-6 shadow-2xl sm:max-h-[calc(100vh-3rem)] sm:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="shrink-0 flex flex-col gap-2 border-b border-[#f0e3d8] pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a37d63]">
            Start Processing
          </p>
          <h2 className="text-2xl font-bold text-[#4d3020]">{order.orderCode}</h2>
          <p className="text-sm text-[#7f6657]">
            {order.shopName} · Placed {new Date(order.placedAt).toLocaleString()}
          </p>
        </div>

        <div className="mt-6 min-h-0 flex-1 overflow-y-auto pr-1 sm:pr-2">
          {loading ? (
            <p className="py-12 text-center text-sm text-[#7f6657]">Checking inventory...</p>
          ) : null}

          {!loading && preview ? (
            <div className="flex flex-col gap-5 pb-2">
              <div
                className={[
                  'rounded-[1.4rem] border px-5 py-4',
                  preview.allItemsAvailable
                    ? 'border-[#cfe2c8] bg-[#f3fbef] text-[#4d6c45]'
                    : 'border-[#f0c96d] bg-[#fff7df] text-[#8c5d0d]',
                ].join(' ')}
              >
                <p className="text-sm font-semibold">
                  {preview.allItemsAvailable
                    ? 'All requested products are available in warehouse inventory.'
                    : 'Some requested products are missing from warehouse inventory.'}
                </p>
                <p className="mt-2 text-sm">
                  Current total: {formatCurrency(preview.currentTotal)}
                  {!preview.allItemsAvailable ? ` · Available total: ${formatCurrency(preview.availableTotal)}` : ''}
                </p>
                <p className="mt-1 text-sm">
                  Delivery promise ends on {new Date(preview.deliveryDueAt).toLocaleString()}.
                </p>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <section className="rounded-[1.4rem] border border-[#ebdfd5] bg-[#fffaf7] p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-[#8a6c58]">
                    Available Items
                  </h3>
                  <div className="mt-4 flex max-h-[18rem] flex-col gap-3 overflow-y-auto pr-1">
                    {preview.availableItems.length > 0 ? (
                      preview.availableItems.map((item) => (
                        <div
                          key={item.itemId}
                          className="rounded-[1.1rem] border border-[#e7dbd0] bg-white px-4 py-3"
                        >
                          <p className="font-semibold text-[#4d3020]">{item.productName}</p>
                          <p className="mt-1 text-xs text-[#7f6657]">
                            Requested: {item.quantity} case(s) · In stock: {item.availableCases} case(s)
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-[#7f6657]">No items are currently available.</p>
                    )}
                  </div>
                </section>

                <section className="rounded-[1.4rem] border border-[#ebdfd5] bg-[#fffaf7] p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-[#8a6c58]">
                    Missing Items
                  </h3>
                  <div className="mt-4 flex max-h-[18rem] flex-col gap-3 overflow-y-auto pr-1">
                    {preview.unavailableItems.length > 0 ? (
                      preview.unavailableItems.map((item) => (
                        <div
                          key={item.itemId}
                          className="rounded-[1.1rem] border border-[#f1d7b4] bg-white px-4 py-3"
                        >
                          <p className="font-semibold text-[#4d3020]">{item.productName}</p>
                          <p className="mt-1 text-xs text-[#7f6657]">
                            Requested: {item.quantity} case(s) · In stock: {item.availableCases} case(s)
                          </p>
                          {item.reason ? (
                            <p className="mt-2 text-xs font-medium text-[#8c5d0d]">{item.reason}</p>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-[#7f6657]">
                        No stock gaps found. This order can move straight to delivery.
                      </p>
                    )}
                  </div>
                </section>
              </div>

              {!preview.allItemsAvailable ? (
                <div className="rounded-[1.2rem] border border-[#ebdfd5] bg-[#fffaf7] px-4 py-4 text-sm text-[#7f6657]">
                  Customer messages will now be generated automatically based on the action you choose.
                  Cancelling will explain the stock shortage, and partial proceed will list removed
                  products, remaining products, the updated total, and an apology.
                </div>
              ) : null}
            </div>
          ) : null}

          {error ? <p className="mt-5 text-sm text-red-600">{error}</p> : null}
        </div>

        <div className="mt-6 shrink-0 flex flex-wrap justify-end gap-3 border-t border-[#f0e3d8] pt-5">
          <button
            type="button"
            onClick={() => {
              onProcessed('Order kept in placed status. No shop-owner message was sent.')
              onClose()
            }}
            className="rounded-[1rem] border border-[#d7baa3] bg-white px-4 py-3 text-sm font-semibold text-[#6e4d3b] transition duration-300 hover:border-[#c9976f] hover:text-[#4d3020]"
          >
            Proceed later
          </button>

          {preview && !preview.allItemsAvailable ? (
            <>
              <button
                type="button"
                onClick={() => void handleProcess('CANCEL_ORDER')}
                disabled={savingAction !== null}
                className="rounded-[1rem] border border-[#e7c0bc] bg-[#fff0ef] px-4 py-3 text-sm font-semibold text-[#9b4b46] transition duration-300 hover:bg-[#ffe5e3] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {savingAction === 'CANCEL_ORDER' ? 'Cancelling...' : 'Cancel order'}
              </button>
              <button
                type="button"
                onClick={() => void handleProcess('PROCEED_AVAILABLE')}
                disabled={savingAction !== null}
                className="rounded-[1rem] bg-[#8b5a3a] px-4 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-[#73492f] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {savingAction === 'PROCEED_AVAILABLE'
                  ? 'Updating order...'
                  : 'Proceed with available products'}
              </button>
            </>
          ) : null}

          {preview?.allItemsAvailable ? (
            <button
              type="button"
              onClick={() => void handleProcess('READY_TO_DELIVER')}
              disabled={savingAction !== null}
              className="rounded-[1rem] bg-[#8b5a3a] px-4 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-[#73492f] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {savingAction === 'READY_TO_DELIVER' ? 'Saving...' : 'Ready to deliver'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default function TmApprovalsPage() {
  const { user, isAuthLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<'orders' | 'users'>('orders')
  const [orders, setOrders] = useState<TmOrder[]>([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [ordersError, setOrdersError] = useState<string | null>(null)
  const [processingTarget, setProcessingTarget] = useState<TmOrder | null>(null)
  const [orderMessage, setOrderMessage] = useState<string | null>(null)
  const [pendingUsers, setPendingUsers] = useState<TmPendingUser[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [approvingUserId, setApprovingUserId] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<TmPendingUser | null>(null)
  const [userMessage, setUserMessage] = useState<string | null>(null)

  if (!isAuthLoading && (!user || user.role !== 'REGIONAL_MANAGER')) {
    return <Navigate to="/" replace />
  }

  const loadOrders = () => {
    setOrdersLoading(true)
    setOrdersError(null)

    fetchTmOrders()
      .then((response) => setOrders(response.orders.filter((order) => order.status === 'PLACED')))
      .catch((requestError) => setOrdersError(getApiErrorMessage(requestError)))
      .finally(() => setOrdersLoading(false))
  }

  const loadUsers = () => {
    setUsersLoading(true)
    setUsersError(null)

    fetchTmPendingUsers()
      .then((response) => setPendingUsers(response.users))
      .catch((requestError) => setUsersError(getApiErrorMessage(requestError)))
      .finally(() => setUsersLoading(false))
  }

  useEffect(() => {
    loadOrders()
    loadUsers()
  }, [])

  const handleApproveUser = async (userId: string) => {
    setApprovingUserId(userId)
    setUserMessage(null)

    try {
      const response = await approveTmUser(userId)
      setUserMessage(response.message)
      loadUsers()
    } catch (requestError) {
      setUserMessage(getApiErrorMessage(requestError))
    } finally {
      setApprovingUserId(null)
    }
  }

  if (!user) {
    return null
  }

  return (
    <TerritoryManagerPortalShell
      user={user}
      breadcrumb="Territory Manager / Approvals"
      title="Approvals"
      description="Review pending account requests under your warehouse and process newly placed shop-owner orders with stock-aware delivery decisions."
      pendingCounts={{ approvals: orders.length + pendingUsers.length }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[1.6rem] border border-[#ebdfd5] bg-[#fff8f2] px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a37d63]">
            Pending Orders
          </p>
          <p className="mt-3 text-3xl font-bold text-[#4d3020]">{orders.length}</p>
          <p className="mt-2 text-sm text-[#7f6657]">
            These orders still need the TM stock check before they can move to delivery.
          </p>
        </div>
        <div className="rounded-[1.6rem] border border-[#ebdfd5] bg-[#fff8f2] px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a37d63]">
            Pending Accounts
          </p>
          <p className="mt-3 text-3xl font-bold text-[#4d3020]">{pendingUsers.length}</p>
          <p className="mt-2 text-sm text-[#7f6657]">
            Shop owners and territory distributors stay pending until you approve them.
          </p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-[#ebdfd5] pb-1">
        {([
          { key: 'orders', label: 'Order Processing', count: orders.length },
          { key: 'users', label: 'Account Approvals', count: pendingUsers.length },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={[
              'rounded-t-xl px-5 py-2.5 text-sm font-semibold transition duration-150',
              activeTab === tab.key
                ? 'border-b-2 border-[#8b5a3a] text-[#4d3020]'
                : 'text-[#8a6c58] hover:text-[#4d3020]',
            ].join(' ')}
          >
            {tab.label}
            <span className="ml-2 rounded-full bg-[#f2e2d4] px-2 py-0.5 text-xs text-[#8b5a3a]">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {activeTab === 'orders' ? (
        <div className={surfaceClass}>
          {orderMessage ? (
            <p className="border-b border-[#dbe7cf] bg-[#f3fbef] px-5 py-3 text-sm font-medium text-[#4d6c45]">
              {orderMessage}
            </p>
          ) : null}
          {ordersLoading ? (
            <p className="px-5 py-10 text-center text-sm text-[#7f6657]">Loading...</p>
          ) : null}
          {ordersError ? (
            <p className="px-5 py-10 text-center text-sm text-red-600">{ordersError}</p>
          ) : null}
          {!ordersLoading && !ordersError ? (
            <div className="overflow-x-auto rounded-[1.8rem]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#ebdfd5] bg-[#fff8f2] text-xs uppercase tracking-wide text-[#8a6c58]">
                    <th className="px-5 py-3 text-left">Order</th>
                    <th className="px-5 py-3 text-left">Shop</th>
                    <th className="px-5 py-3 text-right">Total</th>
                    <th className="px-5 py-3 text-left">Placed</th>
                    <th className="px-5 py-3 text-left">Items</th>
                    <th className="px-5 py-3 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-[#f1e5db] last:border-0 hover:bg-[#fffaf7]"
                    >
                      <td className="px-5 py-3.5 font-mono text-xs font-semibold text-[#4d3020]">
                        {order.orderCode}
                      </td>
                      <td className="px-5 py-3.5 text-[#7f6657]">{order.shopName}</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-[#4d3020]">
                        {formatCurrency(order.totalAmount)}
                      </td>
                      <td className="px-5 py-3.5 text-[#7f6657]">
                        {new Date(order.placedAt).toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-[#7f6657]">
                        {order.items.length} line{order.items.length === 1 ? '' : 's'}
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          type="button"
                          onClick={() => setProcessingTarget(order)}
                          className="rounded-[1rem] bg-[#8b5a3a] px-4 py-2 text-xs font-semibold text-white transition duration-300 hover:bg-[#73492f]"
                        >
                          Start process
                        </button>
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-[#7f6657]">
                        No placed orders are waiting for approval right now.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === 'users' ? (
        <div className={surfaceClass}>
          {userMessage ? (
            <p className="border-b border-[#ebdfd5] px-5 py-3 text-sm text-[#8b5a3a]">
              {userMessage}
            </p>
          ) : null}
          {usersLoading ? (
            <p className="px-5 py-10 text-center text-sm text-[#7f6657]">Loading...</p>
          ) : null}
          {usersError ? (
            <p className="px-5 py-10 text-center text-sm text-red-600">{usersError}</p>
          ) : null}
          {!usersLoading && !usersError ? (
            <div className="overflow-x-auto rounded-[1.8rem]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#ebdfd5] bg-[#fff8f2] text-xs uppercase tracking-wide text-[#8a6c58]">
                    <th className="px-5 py-3 text-left">Name</th>
                    <th className="px-5 py-3 text-left">Role</th>
                    <th className="px-5 py-3 text-left">Status</th>
                    <th className="px-5 py-3 text-left">Contact</th>
                    <th className="px-5 py-3 text-left">Registered</th>
                    <th className="px-5 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingUsers.map((pendingUser) => (
                    <tr
                      key={pendingUser.id}
                      className="border-b border-[#f1e5db] last:border-0 hover:bg-[#fffaf7]"
                    >
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-[#4d3020]">
                          {pendingUser.firstName} {pendingUser.lastName}
                        </p>
                        <p className="text-xs text-[#8a6c58]">{pendingUser.username}</p>
                      </td>
                      <td className="px-5 py-3.5 text-[#7f6657]">{roleLabel(pendingUser.role)}</td>
                      <td className="px-5 py-3.5 text-[#7f6657]">
                        <div className="flex flex-col gap-1">
                          <span>{pendingUser.approvalStatus}</span>
                          <span className="text-xs text-[#a37d63]">{pendingUser.accountStatus}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-[#7f6657]">{pendingUser.phoneNumber}</td>
                      <td className="px-5 py-3.5 text-[#7f6657]">
                        {new Date(pendingUser.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => void handleApproveUser(pendingUser.id)}
                            disabled={approvingUserId === pendingUser.id}
                            className="rounded-[1rem] bg-[#8b5a3a] px-3 py-2 text-xs font-semibold text-white transition duration-300 hover:bg-[#73492f] disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {approvingUserId === pendingUser.id ? 'Approving...' : 'Approve'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejectTarget(pendingUser)}
                            className="rounded-[1rem] border border-[#e7c0bc] bg-[#fff0ef] px-3 py-2 text-xs font-semibold text-[#9b4b46] transition duration-300 hover:bg-[#ffe5e3]"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {pendingUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-[#7f6657]">
                        No pending accounts.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}

      {rejectTarget ? (
        <RejectModal
          user={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onRejected={(message) => {
            setUserMessage(message)
            loadUsers()
          }}
        />
      ) : null}

      {processingTarget ? (
        <ProcessOrderModal
          order={processingTarget}
          onClose={() => setProcessingTarget(null)}
          onProcessed={(message) => {
            setOrderMessage(message)
            loadOrders()
          }}
        />
      ) : null}
    </TerritoryManagerPortalShell>
  )
}
