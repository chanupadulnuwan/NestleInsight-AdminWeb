import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  createTmAssignment,
  delayTmOrder,
  fetchMyWarehouse,
  fetchTmOrders,
  type TmOrder,
  type TmWarehouseUser,
  type TmWarehouseVehicle,
} from '../../api/tm'
import { getApiErrorMessage } from '../../api/client'
import { TerritoryManagerPortalShell } from '../../components/TerritoryManagerPortalShell'
import { useAuth } from '../../context/AuthContext'
import { formatCurrency } from '../productsPage.helpers'

const surfaceClass =
  'rounded-[1.8rem] border border-[#ebdfd5] bg-white shadow-[0_20px_48px_rgba(59,31,15,0.08)]'

const STATUS_BADGE: Record<string, string> = {
  PLACED: 'border border-[#d7baa3] bg-[#fff8f2] text-[#8b5a3a]',
  APPROVED: 'border border-[#d7baa3] bg-[#fff8f2] text-[#8b5a3a]',
  PROCEED: 'border border-[#d7baa3] bg-[#fff8f2] text-[#8b5a3a]',
  DELAYED: 'border border-[#f0c96d] bg-[#fff2c8] text-[#8c5d0d]',
  ASSIGNED: 'border border-[#d9d0f0] bg-[#f7f3ff] text-[#6b4ca0]',
  COMPLETED: 'border border-[#cfe2c8] bg-[#f3fbef] text-[#4d6c45]',
  CANCELLED: 'border border-[#e0a7a3] bg-[#fff0ef] text-[#9b4b46]',
}

function isProceedStatus(status: string) {
  return status === 'PROCEED' || status === 'APPROVED'
}

function statusLabel(status: string) {
  if (isProceedStatus(status)) {
    return 'Ready for delivery'
  }

  return status.charAt(0) + status.slice(1).toLowerCase()
}

function DelayModal({
  order,
  onClose,
  onDelayed,
}: {
  order: TmOrder
  onClose: () => void
  onDelayed: () => void
}) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelay = async () => {
    if (reason.trim().length < 5) {
      setError('Reason must be at least 5 characters.')
      return
    }

    setSaving(true)

    try {
      await delayTmOrder(order.id, reason.trim())
      onDelayed()
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
        <h2 className="text-xl font-bold text-[#4d3020]">Mark as delayed</h2>
        <p className="mt-2 text-sm text-[#7f6657]">
          Order <strong>{order.orderCode}</strong>
        </p>
        <label className="mt-5 flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#8a6c58]">
            Delay reason
          </span>
          <textarea
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Explain why this order is delayed..."
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
            onClick={() => void handleDelay()}
            disabled={saving}
            className="flex-1 rounded-[1rem] bg-[#b96c2f] px-4 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-[#945422] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? 'Saving...' : 'Mark delayed'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AssignModal({
  selectedOrderIds,
  distributors,
  vehicles,
  onClose,
  onAssigned,
}: {
  selectedOrderIds: string[]
  distributors: TmWarehouseUser[]
  vehicles: TmWarehouseVehicle[]
  onClose: () => void
  onAssigned: () => void
}) {
  const [distributorId, setDistributorId] = useState('')
  const [vehicleId, setVehicleId] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shopPins, setShopPins] = useState<Array<{ orderId: string; pin: string }> | null>(
    null,
  )

  const handleAssign = async () => {
    if (!distributorId) {
      setError('Select a distributor before assigning orders.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const response = await createTmAssignment({
        distributorId,
        vehicleId: vehicleId || undefined,
        orderIds: selectedOrderIds,
        notes: notes.trim() || undefined,
      })
      setShopPins(response.shopPins)
      onAssigned()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  if (shopPins) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md rounded-[2rem] border border-[#ebdfd5] bg-white p-8 shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <h2 className="text-xl font-bold text-[#4d3020]">Assignment created</h2>
          <p className="mt-2 text-sm text-[#7f6657]">
            Share these 6-digit delivery PINs with the matching shop owners.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            {shopPins.map((pinEntry, index) => (
              <div
                key={pinEntry.orderId}
                className="flex items-center justify-between rounded-[1rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-3"
              >
                <span className="text-xs text-[#8a6c58]">Order #{index + 1}</span>
                <span className="font-mono text-lg font-bold tracking-widest text-[#4d3020]">
                  {pinEntry.pin}
                </span>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mt-5 w-full rounded-[1rem] bg-[#8b5a3a] px-4 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-[#73492f]"
          >
            Done
          </button>
        </div>
      </div>
    )
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
        <h2 className="text-xl font-bold text-[#4d3020]">Start delivery route</h2>
        <p className="mt-1 text-sm text-[#7f6657]">
          {selectedOrderIds.length} order(s) selected
        </p>
        <div className="mt-5 flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#8a6c58]">
              Distributor
            </span>
            <select
              value={distributorId}
              onChange={(event) => setDistributorId(event.target.value)}
              className="rounded-[1rem] border border-[#e5d3c6] bg-[#fffdfb] px-4 py-3 text-sm text-[#452d1f] outline-none transition duration-300 focus:border-[#c99267] focus:ring-2 focus:ring-[#f1dac9]"
            >
              <option value="">Select distributor...</option>
              {distributors.map((distributor) => (
                <option key={distributor.id} value={distributor.id}>
                  {distributor.firstName} {distributor.lastName}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#8a6c58]">
              Vehicle
            </span>
            <select
              value={vehicleId}
              onChange={(event) => setVehicleId(event.target.value)}
              className="rounded-[1rem] border border-[#e5d3c6] bg-[#fffdfb] px-4 py-3 text-sm text-[#452d1f] outline-none transition duration-300 focus:border-[#c99267] focus:ring-2 focus:ring-[#f1dac9]"
            >
              <option value="">No vehicle</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.label} ({vehicle.capacityCases} cases)
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#8a6c58]">
              Notes
            </span>
            <input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional notes for the distributor..."
              className="rounded-[1rem] border border-[#e5d3c6] bg-[#fffdfb] px-4 py-3 text-sm text-[#452d1f] outline-none transition duration-300 focus:border-[#c99267] focus:ring-2 focus:ring-[#f1dac9]"
            />
          </label>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-[1rem] border border-[#d7baa3] bg-white px-4 py-3 text-sm font-semibold text-[#6e4d3b] transition duration-300 hover:border-[#c9976f] hover:text-[#4d3020]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleAssign()}
              disabled={saving}
              className="flex-1 rounded-[1rem] bg-[#8b5a3a] px-4 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-[#73492f] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? 'Starting delivery...' : 'Start delivery & generate PINs'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TmOrdersPage() {
  const { user, isAuthLoading } = useAuth()
  const [orders, setOrders] = useState<TmOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [delayTarget, setDelayTarget] = useState<TmOrder | null>(null)
  const [showAssign, setShowAssign] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [distributors, setDistributors] = useState<TmWarehouseUser[]>([])
  const [vehicles, setVehicles] = useState<TmWarehouseVehicle[]>([])

  if (!isAuthLoading && (!user || user.role !== 'REGIONAL_MANAGER')) {
    return <Navigate to="/" replace />
  }

  const load = () => {
    setLoading(true)
    setError(null)

    Promise.all([fetchTmOrders(), fetchMyWarehouse()])
      .then(([ordersResponse, warehouseResponse]) => {
        setOrders(ordersResponse.orders)
        setDistributors(
          warehouseResponse.warehouse.users.filter(
            (warehouseUser) => warehouseUser.role === 'TERRITORY_DISTRIBUTOR',
          ),
        )
        setVehicles(warehouseResponse.warehouse.vehicles)
      })
      .catch((requestError) => setError(getApiErrorMessage(requestError)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const filteredOrders = orders.filter((order) => {
    if (statusFilter === 'ALL') {
      return true
    }

    if (statusFilter === 'OVERDUE') {
      return order.isOverdue
    }

    if (statusFilter === 'PROCEED') {
      return isProceedStatus(order.status)
    }

    return order.status === statusFilter
  })

  const toggleSelect = (orderId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(orderId)) {
        next.delete(orderId)
      } else {
        next.add(orderId)
      }
      return next
    })
  }

  const clearSelection = () => setSelectedIds(new Set())

  const selectAllProceedOrders = () => {
    setSelectedIds(
      new Set(filteredOrders.filter((order) => isProceedStatus(order.status)).map((order) => order.id)),
    )
  }

  if (!user) {
    return null
  }

  const statusOptions = [
    'ALL',
    'PLACED',
    'PROCEED',
    'ASSIGNED',
    'DELAYED',
    'COMPLETED',
    'OVERDUE',
  ]

  return (
    <TerritoryManagerPortalShell
      user={user}
      breadcrumb="Territory Manager / Orders"
      title="Orders"
      description="Review warehouse orders after approval, mark delays with reasons, and start delivery by assigning ready orders to a distributor and vehicle."
      actions={
        selectedIds.size > 0 ? (
          <button
            type="button"
            onClick={() => setShowAssign(true)}
            className="rounded-[1rem] bg-[#8b5a3a] px-4 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-[#73492f]"
          >
            Start delivery for {selectedIds.size} order{selectedIds.size > 1 ? 's' : ''}
          </button>
        ) : undefined
      }
    >
      <div className="flex flex-wrap gap-2">
        {statusOptions.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={[
              'rounded-full px-4 py-1.5 text-xs font-semibold transition duration-200',
              statusFilter === status
                ? 'bg-[#4d3020] text-white'
                : 'border border-[#ebdfd5] bg-[#fff9f5] text-[#8a6c58] hover:bg-[#fff3ea] hover:text-[#4d3020]',
            ].join(' ')}
          >
            {status === 'ALL'
              ? 'All'
              : status === 'PROCEED'
                ? 'Ready'
                : status.charAt(0) + status.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {message ? <p className="text-sm text-[#8b5a3a]">{message}</p> : null}

      {loading ? (
        <p className="py-12 text-center text-sm text-[#7f6657]">Loading orders...</p>
      ) : null}
      {error ? <p className="py-12 text-center text-sm text-red-600">{error}</p> : null}

      {!loading && !error ? (
        <>
          {selectedIds.size > 0 ? (
            <div className="flex flex-wrap items-center gap-3 rounded-[1.2rem] border border-[#eee2d7] bg-[#fff9f5] px-5 py-3 text-sm text-[#4d3020]">
              <span className="font-semibold">{selectedIds.size} order(s) selected</span>
              <button
                type="button"
                onClick={selectAllProceedOrders}
                className="text-[#8b5a3a] underline"
              >
                Select all ready orders
              </button>
              <button type="button" onClick={clearSelection} className="text-[#7f6657] underline">
                Clear
              </button>
            </div>
          ) : null}

          <div className={surfaceClass}>
            <div className="overflow-x-auto rounded-[1.8rem]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#ebdfd5] bg-[#fff8f2] text-xs uppercase tracking-wide text-[#8a6c58]">
                    <th className="px-4 py-3 text-left" />
                    <th className="px-4 py-3 text-left">Order</th>
                    <th className="px-4 py-3 text-left">Shop</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-left">Timeline</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Delay Reason</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr
                      key={order.id}
                      className={[
                        'border-b border-[#f1e5db] last:border-0',
                        order.isOverdue ? 'bg-[#fff8ef]' : 'hover:bg-[#fffaf7]',
                        selectedIds.has(order.id) ? 'bg-[#fff1e6]' : '',
                      ].join(' ')}
                    >
                      <td className="px-4 py-3.5">
                        {isProceedStatus(order.status) ? (
                          <input
                            type="checkbox"
                            checked={selectedIds.has(order.id)}
                            onChange={() => toggleSelect(order.id)}
                            className="h-4 w-4 rounded border-[#d7baa3] text-[#8b5a3a]"
                          />
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs font-semibold text-[#4d3020]">
                          {order.orderCode}
                        </span>
                        {order.isOverdue ? (
                          <span className="ml-2 rounded-full bg-[#fef3c7] px-1.5 py-0.5 text-xs font-bold text-[#92400e]">
                            Overdue
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5 text-[#7f6657]">{order.shopName}</td>
                      <td className="px-4 py-3.5 text-right font-semibold text-[#4d3020]">
                        {formatCurrency(order.totalAmount)}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-[#7f6657]">
                        <p>Placed: {new Date(order.placedAt).toLocaleString()}</p>
                        <p className="mt-1">Due: {new Date(order.deliveryDueAt).toLocaleString()}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[order.status] ?? 'border border-[#ebdfd5] bg-[#fff9f5] text-[#7f6657]'}`}
                        >
                          {statusLabel(order.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 max-w-[220px]">
                        {order.delayReason ? (
                          <p className="text-xs leading-5 text-[#8c5d0d]">{order.delayReason}</p>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {!['COMPLETED', 'CANCELLED', 'DELAYED'].includes(order.status) ? (
                          <button
                            type="button"
                            onClick={() => setDelayTarget(order)}
                            className="rounded-[1rem] border border-[#f0c96d] bg-[#fff2c8] px-3 py-2 text-xs font-semibold text-[#8c5d0d] transition duration-300 hover:bg-[#ffe7a0]"
                          >
                            Mark delayed
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-10 text-center text-[#7f6657]">
                        No orders match the selected filter.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      {delayTarget ? (
        <DelayModal
          order={delayTarget}
          onClose={() => setDelayTarget(null)}
          onDelayed={() => {
            load()
            setMessage('Order marked as delayed.')
          }}
        />
      ) : null}

      {showAssign ? (
        <AssignModal
          selectedOrderIds={Array.from(selectedIds)}
          distributors={distributors}
          vehicles={vehicles}
          onClose={() => {
            setShowAssign(false)
            clearSelection()
          }}
          onAssigned={() => {
            load()
            setMessage('Delivery started and stock reserved for the selected orders.')
          }}
        />
      ) : null}
    </TerritoryManagerPortalShell>
  )
}
