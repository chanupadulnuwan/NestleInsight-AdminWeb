import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  fetchMyWarehouse,
  fetchTmAssignments,
  fetchTmIncidents,
  fetchTmReturns,
  generateReturnPin,
  type TmAssignment,
  type TmIncident,
  type TmInventoryItem,
  type TmReturn,
} from '../../api/tm'
import { getApiErrorMessage } from '../../api/client'
import { TerritoryManagerPortalShell } from '../../components/TerritoryManagerPortalShell'
import { useAuth } from '../../context/AuthContext'

const surfaceClass =
  'rounded-[1.8rem] border border-[#ebdfd5] bg-white shadow-[0_20px_48px_rgba(59,31,15,0.08)]'

const INCIDENT_LABELS: Record<string, string> = {
  VEHICLE_ACCIDENT: 'Vehicle Accident',
  VEHICLE_BREAKDOWN: 'Vehicle Breakdown',
  FUEL_PROBLEM: 'Fuel Problem',
  ROUTE_ISSUE: 'Route Issue',
  DELIVERY_DELAY: 'Delivery Delay',
  CUSTOMER_DISPUTE: 'Customer Dispute',
  OTHER: 'Other',
}

export default function TmStockPage() {
  const { user, isAuthLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<'stock' | 'returns' | 'incidents' | 'trips'>(
    'stock',
  )
  const [inventory, setInventory] = useState<TmInventoryItem[]>([])
  const [stockLoading, setStockLoading] = useState(true)
  const [stockError, setStockError] = useState<string | null>(null)
  const [returns, setReturns] = useState<TmReturn[]>([])
  const [returnsLoading, setReturnsLoading] = useState(true)
  const [returnsError, setReturnsError] = useState<string | null>(null)
  const [incidents, setIncidents] = useState<TmIncident[]>([])
  const [incidentsLoading, setIncidentsLoading] = useState(true)
  const [incidentsError, setIncidentsError] = useState<string | null>(null)
  const [assignments, setAssignments] = useState<TmAssignment[]>([])
  const [tripsLoading, setTripsLoading] = useState(true)
  const [tripsError, setTripsError] = useState<string | null>(null)
  const [generatingPinId, setGeneratingPinId] = useState<string | null>(null)
  const [pinResult, setPinResult] = useState<Record<string, { pin: string; expiresAt: string }>>(
    {},
  )

  if (!isAuthLoading && (!user || user.role !== 'REGIONAL_MANAGER')) {
    return <Navigate to="/" replace />
  }

  useEffect(() => {
    fetchMyWarehouse()
      .then((response) => setInventory(response.warehouse.inventory))
      .catch((requestError) => setStockError(getApiErrorMessage(requestError)))
      .finally(() => setStockLoading(false))

    fetchTmReturns()
      .then((response) => setReturns(response.returns))
      .catch((requestError) => setReturnsError(getApiErrorMessage(requestError)))
      .finally(() => setReturnsLoading(false))

    fetchTmIncidents()
      .then((response) => setIncidents(response.incidents))
      .catch((requestError) => setIncidentsError(getApiErrorMessage(requestError)))
      .finally(() => setIncidentsLoading(false))

    fetchTmAssignments()
      .then((response) => setAssignments(response.assignments))
      .catch((requestError) => setTripsError(getApiErrorMessage(requestError)))
      .finally(() => setTripsLoading(false))
  }, [])

  const handleGenerateReturnPin = async (assignmentId: string) => {
    setGeneratingPinId(assignmentId)

    try {
      const response = await generateReturnPin(assignmentId)
      setPinResult((current) => ({
        ...current,
        [assignmentId]: { pin: response.pin, expiresAt: response.expiresAt },
      }))
    } finally {
      setGeneratingPinId(null)
    }
  }

  if (!user) {
    return null
  }

  const tabs = [
    { key: 'stock' as const, label: 'Stock Levels', count: inventory.length },
    { key: 'trips' as const, label: 'Delivery Trips', count: assignments.length },
    { key: 'returns' as const, label: 'Returns', count: returns.length },
    { key: 'incidents' as const, label: 'Incidents', count: incidents.length },
  ]

  return (
    <TerritoryManagerPortalShell
      user={user}
      breadcrumb="Territory Manager · Stock"
      title="Stock & Operations"
      description="Monitor stock levels, active delivery trips, submitted returns, and distributor incident reports."
    >
      <div className="flex flex-wrap gap-2 border-b border-[#ebdfd5] pb-1">
        {tabs.map((tab) => (
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

      {activeTab === 'stock' ? (
        <div className={surfaceClass}>
          {stockLoading ? (
            <p className="px-5 py-10 text-center text-sm text-[#7f6657]">Loading...</p>
          ) : null}
          {stockError ? (
            <p className="px-5 py-10 text-center text-sm text-red-600">{stockError}</p>
          ) : null}
          {!stockLoading && !stockError ? (
            <div className="overflow-x-auto rounded-[1.8rem]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#ebdfd5] bg-[#fff8f2] text-xs uppercase tracking-wide text-[#8a6c58]">
                    <th className="px-5 py-3 text-left">Product</th>
                    <th className="px-5 py-3 text-right">On Hand</th>
                    <th className="px-5 py-3 text-right">Refill At</th>
                    <th className="px-5 py-3 text-right">Capacity</th>
                    <th className="px-5 py-3 text-left">Fill %</th>
                    <th className="px-5 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((item) => {
                    const fill =
                      item.maxCapacityCases > 0
                        ? Math.min(
                            100,
                            Math.round((item.quantityOnHand / item.maxCapacityCases) * 100),
                          )
                        : 0
                    return (
                      <tr
                        key={item.id}
                        className="border-b border-[#f1e5db] last:border-0 hover:bg-[#fffaf7]"
                      >
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-[#4d3020]">{item.productName ?? '—'}</p>
                          {item.packSize ? (
                            <p className="text-xs text-[#7f6657]">{item.packSize}</p>
                          ) : null}
                        </td>
                        <td className="px-5 py-3.5 text-right font-bold text-[#4d3020]">
                          {item.quantityOnHand}
                        </td>
                        <td className="px-5 py-3.5 text-right text-[#7f6657]">
                          {item.reorderLevel}
                        </td>
                        <td className="px-5 py-3.5 text-right text-[#7f6657]">
                          {item.maxCapacityCases}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-[#f1e5db]">
                              <div
                                className={`h-full rounded-full ${fill < 20 ? 'bg-red-400' : fill < 50 ? 'bg-yellow-500' : 'bg-[#8b5a3a]'}`}
                                style={{ width: `${fill}%` }}
                              />
                            </div>
                            <span className="text-xs text-[#7f6657]">{fill}%</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={[
                              'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                              item.status === 'LOW_STOCK'
                                ? 'border border-[#f0c96d] bg-[#fff2c8] text-[#8c5d0d]'
                                : item.status === 'INACTIVE_PRODUCT'
                                  ? 'border border-[#e0a7a3] bg-[#fff0ef] text-[#9b4b46]'
                                  : 'border border-[#d7baa3] bg-[#fff8f2] text-[#8b5a3a]',
                            ].join(' ')}
                          >
                            {item.status === 'LOW_STOCK'
                              ? 'Low stock'
                              : item.status === 'INACTIVE_PRODUCT'
                                ? 'Inactive'
                                : 'Healthy'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                  {inventory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-[#7f6657]">
                        No inventory data.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === 'trips' ? (
        <div className="flex flex-col gap-4">
          {tripsLoading ? (
            <p className="py-10 text-center text-sm text-[#7f6657]">Loading...</p>
          ) : null}
          {tripsError ? (
            <p className="py-10 text-center text-sm text-red-600">{tripsError}</p>
          ) : null}
          {!tripsLoading && !tripsError && assignments.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#7f6657]">No delivery trips yet.</p>
          ) : null}
          {assignments.map((assignment) => (
            <div key={assignment.id} className={`${surfaceClass} p-6`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#a37d63]">
                    {assignment.deliveryDate}
                  </p>
                  <p className="mt-1 text-base font-bold text-[#4d3020]">
                    {assignment.distributorName}
                  </p>
                  {assignment.vehicleLabel ? (
                    <p className="text-sm text-[#7f6657]">
                      {assignment.vehicleLabel}
                      {assignment.vehicleRegistrationNumber
                        ? ` · ${assignment.vehicleRegistrationNumber}`
                        : ''}
                      {assignment.vehicleCapacityCases
                        ? ` · ${assignment.vehicleCapacityCases} cases`
                        : ''}
                    </p>
                  ) : null}
                  <span
                    className={[
                      'mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-semibold',
                      assignment.status === 'ACTIVE'
                        ? 'border border-[#d7baa3] bg-[#fff8f2] text-[#8b5a3a]'
                        : assignment.status === 'COMPLETED'
                          ? 'border border-[#cfe2c8] bg-[#f3fbef] text-[#4d6c45]'
                          : 'border border-[#ebdfd5] bg-[#fff9f5] text-[#7f6657]',
                    ].join(' ')}
                  >
                    {assignment.status}
                  </span>
                </div>

                {assignment.status === 'ACTIVE' ? (
                  <div className="flex flex-col items-end gap-2">
                    {pinResult[assignment.id] ? (
                      <div className="rounded-[1.35rem] border border-[#eee2d7] bg-[#fff9f5] px-5 py-3 text-center">
                        <p className="text-xs text-[#7f6657]">Return PIN</p>
                        <p className="mt-1 font-mono text-2xl font-bold tracking-widest text-[#4d3020]">
                          {pinResult[assignment.id].pin}
                        </p>
                        <p className="mt-1 text-xs text-[#7f6657]">
                          Expires {new Date(pinResult[assignment.id].expiresAt).toLocaleTimeString()}
                        </p>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleGenerateReturnPin(assignment.id)}
                        disabled={generatingPinId === assignment.id}
                        className="rounded-[1rem] bg-[#8b5a3a] px-4 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-[#73492f] disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {generatingPinId === assignment.id
                          ? 'Generating...'
                          : 'Generate Return PIN'}
                      </button>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="mt-4 border-t border-[#ebdfd5] pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#a37d63]">
                  Orders ({assignment.orders.length})
                </p>
                <div className="mt-2 flex flex-col gap-1.5">
                  {assignment.orders.map((order) => (
                    <div
                      key={order.daoId}
                      className="flex items-center justify-between text-sm text-[#7f6657]"
                    >
                      <span className="font-mono text-xs text-[#4d3020]">
                        {order.orderCode ?? '—'}
                      </span>
                      <span>{order.shopName ?? '—'}</span>
                      <span
                        className={[
                          'rounded-full px-2 py-0.5 text-xs font-semibold',
                          order.status === 'COMPLETED'
                            ? 'border border-[#cfe2c8] bg-[#f3fbef] text-[#4d6c45]'
                            : 'border border-[#ebdfd5] bg-[#fff9f5] text-[#7f6657]',
                        ].join(' ')}
                      >
                        {order.status ?? '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {activeTab === 'returns' ? (
        <div className="flex flex-col gap-4">
          {returnsLoading ? (
            <p className="py-10 text-center text-sm text-[#7f6657]">Loading...</p>
          ) : null}
          {returnsError ? (
            <p className="py-10 text-center text-sm text-red-600">{returnsError}</p>
          ) : null}
          {!returnsLoading && !returnsError && returns.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#7f6657]">No returns submitted yet.</p>
          ) : null}
          {returns.map((orderReturn) => (
            <div key={orderReturn.id} className={`${surfaceClass} p-6`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-[#4d3020]">
                    {orderReturn.distributorName ?? orderReturn.distributorId}
                  </p>
                  <p className="text-xs text-[#7f6657]">
                    {new Date(orderReturn.createdAt).toLocaleString()}
                  </p>
                </div>
                <span
                  className={[
                    'rounded-full px-3 py-0.5 text-xs font-semibold',
                    orderReturn.tmVerified
                      ? 'border border-[#cfe2c8] bg-[#f3fbef] text-[#4d6c45]'
                      : 'border border-[#f0c96d] bg-[#fff2c8] text-[#8c5d0d]',
                  ].join(' ')}
                >
                  {orderReturn.tmVerified ? 'Verified' : 'Unverified'}
                </span>
              </div>
              <div className="mt-4 border-t border-[#ebdfd5] pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#a37d63]">
                  Returned Items
                </p>
                <div className="mt-2 flex flex-col gap-2">
                  {orderReturn.items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-[1rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-3"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-[#4d3020]">{item.productName}</p>
                        <p className="text-sm font-bold text-[#4d3020]">×{item.quantity}</p>
                      </div>
                      <p className="mt-1 text-xs text-[#8c5d0d]">Reason: {item.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {activeTab === 'incidents' ? (
        <div className="flex flex-col gap-4">
          {incidentsLoading ? (
            <p className="py-10 text-center text-sm text-[#7f6657]">Loading...</p>
          ) : null}
          {incidentsError ? (
            <p className="py-10 text-center text-sm text-red-600">{incidentsError}</p>
          ) : null}
          {!incidentsLoading && !incidentsError && incidents.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#7f6657]">No incidents reported.</p>
          ) : null}
          {incidents.map((incident) => (
            <div key={incident.id} className={`${surfaceClass} p-6`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-[#4d3020]">
                    {incident.reporterName ?? incident.reportedBy}
                  </p>
                  <p className="text-xs text-[#7f6657]">
                    {new Date(incident.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className="rounded-full border border-[#e7c0bc] bg-[#fff0ef] px-3 py-0.5 text-xs font-semibold text-[#9b4b46]">
                  {INCIDENT_LABELS[incident.incidentType] ?? incident.incidentType}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#7f6657]">
                {incident.description}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </TerritoryManagerPortalShell>
  )
}
