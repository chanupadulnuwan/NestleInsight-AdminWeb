import { useEffect, useState } from 'react'
import {
  fetchAdminOrderDetails,
  fetchAdminOrders,
  type AdminOrderDetailRecord,
  type AdminOrderSummaryRecord,
} from '../api/orders'
import { getApiErrorMessage } from '../api/client'
import {
  fetchTerritories,
  type TerritoryRecord,
} from '../api/territories'
import {
  fetchWarehouses,
  type WarehouseSummaryRecord,
} from '../api/warehouses'
import { formatCurrency } from '../pages/productsPage.helpers'

const surfaceClassName =
  'rounded-[1.8rem] border border-[#ebdfd5] bg-white shadow-[0_20px_48px_rgba(59,31,15,0.08)]'

type FiltersState = {
  territoryId: string
  warehouseId: string
  dateFrom: string
  dateTo: string
}

const defaultFilters: FiltersState = {
  territoryId: '',
  warehouseId: '',
  dateFrom: '',
  dateTo: '',
}

const STATUS_BADGE: Record<string, string> = {
  PLACED: 'border border-[#d7baa3] bg-[#fff8f2] text-[#8b5a3a]',
  APPROVED: 'border border-[#d7baa3] bg-[#fff8f2] text-[#8b5a3a]',
  PROCEED: 'border border-[#d7baa3] bg-[#fff8f2] text-[#8b5a3a]',
  DELAYED: 'border border-[#f0c96d] bg-[#fff2c8] text-[#8c5d0d]',
  ASSIGNED: 'border border-[#d9d0f0] bg-[#f7f3ff] text-[#6b4ca0]',
  COMPLETED: 'border border-[#cfe2c8] bg-[#f3fbef] text-[#4d6c45]',
  CANCELLED: 'border border-[#e0a7a3] bg-[#fff0ef] text-[#9b4b46]',
}

function statusLabel(status: string) {
  if (status === 'PROCEED' || status === 'APPROVED') {
    return 'Ready for delivery'
  }

  return status.charAt(0) + status.slice(1).toLowerCase()
}

function paymentMethodLabel(paymentMethod: string) {
  return paymentMethod === 'CASH_ON_DELIVERY'
    ? 'Cash on delivery'
    : 'Standard checkout'
}

function formatDateTime(value: string | null) {
  if (!value) {
    return 'Not available'
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleString()
}

function AdminOrderDetailsModal({
  order,
  loading,
  error,
  onClose,
}: {
  order: AdminOrderDetailRecord | null
  loading: boolean
  error: string | null
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl rounded-[2rem] border border-[#ebdfd5] bg-white p-8 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8a6c58]">
              Order details
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[#4d3020]">
              {order?.orderCode ?? 'Loading order'}
            </h2>
            <p className="mt-2 text-sm text-[#7f6657]">
              {order
                ? `${order.shopName} - ${statusLabel(order.status)}`
                : 'Preparing order details...'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[1rem] border border-[#d7baa3] bg-white px-4 py-2 text-sm font-semibold text-[#6e4d3b] transition duration-300 hover:border-[#c9976f] hover:text-[#4d3020]"
          >
            Close
          </button>
        </div>

        {loading ? (
          <div className="mt-6 rounded-[1.4rem] border border-[#eee2d7] bg-[#fffaf7] px-5 py-8 text-sm text-[#7f6657]">
            Loading order details...
          </div>
        ) : error ? (
          <div className="mt-6 rounded-[1.4rem] border border-[#ebc0bb] bg-[#fff2f1] px-5 py-4 text-sm text-[#92524b]">
            {error}
          </div>
        ) : order ? (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ['Payment', paymentMethodLabel(order.paymentMethod)],
                ['Placed', formatDateTime(order.placedAt)],
                ['Territory', order.territoryName || 'Not assigned'],
                ['Warehouse', order.warehouseName || 'Not assigned'],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="rounded-[1.2rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#8a6c58]">
                    {label}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#4d3020]">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.4rem] border border-[#eee2d7] bg-[#fffdfb] px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8a6c58]">
                  Promotion
                </p>
                <p className="mt-2 text-sm text-[#4d3020]">
                  {order.appliedPromotionCode
                    ? `Promo ${order.appliedPromotionCode}`
                    : 'No promotion applied'}
                </p>
                {(order.promotionDiscountTotal ?? 0) > 0 ? (
                  <div className="mt-3 space-y-1 text-sm text-[#7f6657]">
                    <p>
                      Before:{' '}
                      {formatCurrency(
                        order.subtotalBeforeDiscount ?? order.totalAmount,
                      )}
                    </p>
                    <p className="font-semibold text-[#4d6c45]">
                      Discount: -{formatCurrency(order.promotionDiscountTotal ?? 0)}
                    </p>
                  </div>
                ) : null}
              </div>
              <div className="rounded-[1.4rem] border border-[#eee2d7] bg-[#fffdfb] px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8a6c58]">
                  Customer note
                </p>
                <p className="mt-2 text-sm text-[#4d3020]">
                  {order.customerNote?.trim() || 'No note added to this order.'}
                </p>
                {order.delayReason ? (
                  <p className="mt-3 text-sm font-semibold text-[#8c5d0d]">
                    Delay reason: {order.delayReason}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-[#ebdfd5] bg-[#fffaf7]">
              <div className="border-b border-[#ebdfd5] px-5 py-4">
                <h3 className="text-lg font-bold text-[#4d3020]">
                  Ordered products
                </h3>
              </div>
              <div className="divide-y divide-[#f1e5db]">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                  >
                    <div>
                      <p className="font-semibold text-[#4d3020]">
                        {item.productName}
                      </p>
                      <p className="mt-1 text-xs text-[#7f6657]">
                        {item.packSize || 'Pack size not available'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[#4d3020]">
                        {item.quantity} case{item.quantity === 1 ? '' : 's'}
                      </p>
                      <p className="mt-1 text-xs text-[#7f6657]">
                        {formatCurrency(item.lineTotal)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-[#ebdfd5] bg-[#fffaf7] px-5 py-5">
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-[#7f6657]">
                    Total before discount
                  </span>
                  <span className="font-semibold text-[#4d3020]">
                    {formatCurrency(order.subtotalBeforeDiscount ?? order.totalAmount)}
                  </span>
                </div>
                {(order.promotionDiscountTotal ?? 0) > 0 ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-[#7f6657]">Discount</span>
                    <span className="font-semibold text-[#4d6c45]">
                      -{formatCurrency(order.promotionDiscountTotal ?? 0)}
                    </span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-3 border-t border-[#ebdfd5] pt-3">
                  <span className="text-base font-bold text-[#4d3020]">
                    Final total
                  </span>
                  <span className="text-lg font-bold text-[#4d3020]">
                    {formatCurrency(order.totalAfterDiscount ?? order.totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

export default function AdminOrdersSection() {
  const [filters, setFilters] = useState<FiltersState>(defaultFilters)
  const [orders, setOrders] = useState<AdminOrderSummaryRecord[]>([])
  const [territories, setTerritories] = useState<TerritoryRecord[]>([])
  const [warehouses, setWarehouses] = useState<WarehouseSummaryRecord[]>([])
  const [loadingLookups, setLoadingLookups] = useState(true)
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [ordersError, setOrdersError] = useState<string | null>(null)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<AdminOrderDetailRecord | null>(
    null,
  )
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  const filteredWarehouses = filters.territoryId
    ? warehouses.filter((warehouse) => warehouse.territoryId === filters.territoryId)
    : warehouses

  useEffect(() => {
    let cancelled = false

    async function loadLookups() {
      setLoadingLookups(true)

      try {
        const [territoriesResponse, warehousesResponse] = await Promise.all([
          fetchTerritories(),
          fetchWarehouses(),
        ])

        if (cancelled) {
          return
        }

        setTerritories(territoriesResponse.territories)
        setWarehouses(warehousesResponse.warehouses)
      } catch (error) {
        if (cancelled) {
          return
        }
        setOrdersError(
          getApiErrorMessage(error, 'Unable to load order filters right now.'),
        )
      } finally {
        if (!cancelled) {
          setLoadingLookups(false)
        }
      }
    }

    void loadLookups()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadOrders() {
      if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) {
        setOrders([])
        setOrdersError('The start date must be before the end date.')
        setLoadingOrders(false)
        return
      }

      setLoadingOrders(true)
      setOrdersError(null)

      try {
        const response = await fetchAdminOrders({
          territoryId: filters.territoryId || undefined,
          warehouseId: filters.warehouseId || undefined,
          dateFrom: filters.dateFrom || undefined,
          dateTo: filters.dateTo || undefined,
        })

        if (cancelled) {
          return
        }

        setOrders(response.orders)
      } catch (error) {
        if (cancelled) {
          return
        }
        setOrdersError(
          getApiErrorMessage(error, 'Unable to load admin orders right now.'),
        )
      } finally {
        if (!cancelled) {
          setLoadingOrders(false)
        }
      }
    }

    void loadOrders()

    return () => {
      cancelled = true
    }
  }, [filters.dateFrom, filters.dateTo, filters.territoryId, filters.warehouseId])

  useEffect(() => {
    if (!selectedOrderId) {
      return
    }

    const orderId = selectedOrderId
    let cancelled = false

    async function loadOrderDetails() {
      setLoadingDetail(true)
      setDetailError(null)
      setSelectedOrder(null)

      try {
        const response = await fetchAdminOrderDetails(orderId)
        if (cancelled) {
          return
        }

        setSelectedOrder(response.order)
      } catch (error) {
        if (cancelled) {
          return
        }
        setDetailError(
          getApiErrorMessage(error, 'Unable to load order details right now.'),
        )
      } finally {
        if (!cancelled) {
          setLoadingDetail(false)
        }
      }
    }

    void loadOrderDetails()

    return () => {
      cancelled = true
    }
  }, [selectedOrderId])

  const discountedOrders = orders.filter(
    (order) => (order.promotionDiscountTotal ?? 0) > 0,
  ).length
  const grossTotal = orders.reduce(
    (sum, order) => sum + (order.subtotalBeforeDiscount ?? order.totalAmount),
    0,
  )
  const netTotal = orders.reduce(
    (sum, order) => sum + (order.totalAfterDiscount ?? order.totalAmount),
    0,
  )

  return (
    <>
      <section className="grid gap-5 xl:grid-cols-[minmax(0,2.2fr)_minmax(20rem,1fr)]">
        <article className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">
                Order directory
              </p>
              <h2 className="mt-3 text-[1.75rem] font-bold tracking-[-0.04em] text-[#4d3020]">
                All admin-visible orders
              </h2>
              <p className="mt-3 text-sm leading-7 text-[#7f6657]">
                Filter orders by date, warehouse, and territory, then open any
                order to review products, totals, and discounts.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFilters(defaultFilters)}
              className="rounded-[1rem] border border-[#d7baa3] bg-white px-4 py-3 text-sm font-semibold text-[#6e4d3b] transition duration-300 hover:border-[#c9976f] hover:text-[#4d3020]"
            >
              Clear filters
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#8a6c58]">
                Date from
              </span>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    dateFrom: event.target.value,
                  }))
                }
                className="rounded-[1rem] border border-[#e5d3c6] bg-[#fffdfb] px-4 py-3 text-sm text-[#452d1f] outline-none transition duration-300 focus:border-[#c99267] focus:ring-2 focus:ring-[#f1dac9]"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#8a6c58]">
                Date to
              </span>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    dateTo: event.target.value,
                  }))
                }
                className="rounded-[1rem] border border-[#e5d3c6] bg-[#fffdfb] px-4 py-3 text-sm text-[#452d1f] outline-none transition duration-300 focus:border-[#c99267] focus:ring-2 focus:ring-[#f1dac9]"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#8a6c58]">
                Territory
              </span>
              <select
                value={filters.territoryId}
                onChange={(event) => {
                  const nextTerritoryId = event.target.value
                  setFilters((current) => {
                    const warehouseStillMatches =
                      !nextTerritoryId ||
                      warehouses.some(
                        (warehouse) =>
                          warehouse.id === current.warehouseId &&
                          warehouse.territoryId === nextTerritoryId,
                      )

                    return {
                      ...current,
                      territoryId: nextTerritoryId,
                      warehouseId: warehouseStillMatches
                        ? current.warehouseId
                        : '',
                    }
                  })
                }}
                disabled={loadingLookups}
                className="rounded-[1rem] border border-[#e5d3c6] bg-[#fffdfb] px-4 py-3 text-sm text-[#452d1f] outline-none transition duration-300 focus:border-[#c99267] focus:ring-2 focus:ring-[#f1dac9] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <option value="">All territories</option>
                {territories.map((territory) => (
                  <option key={territory.id} value={territory.id}>
                    {territory.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#8a6c58]">
                Warehouse
              </span>
              <select
                value={filters.warehouseId}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    warehouseId: event.target.value,
                  }))
                }
                disabled={loadingLookups}
                className="rounded-[1rem] border border-[#e5d3c6] bg-[#fffdfb] px-4 py-3 text-sm text-[#452d1f] outline-none transition duration-300 focus:border-[#c99267] focus:ring-2 focus:ring-[#f1dac9] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <option value="">All warehouses</option>
                {filteredWarehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {ordersError ? (
            <div className="mt-5 rounded-[1rem] border border-[#ebc0bb] bg-[#fff2f1] px-4 py-3 text-sm text-[#92524b]">
              {ordersError}
            </div>
          ) : null}

          <div className="mt-6 space-y-3">
            {loadingOrders ? (
              <div className="rounded-[1.35rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-6 text-sm text-[#7f6657]">
                Loading orders...
              </div>
            ) : orders.length === 0 ? (
              <div className="rounded-[1.35rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-6 text-sm text-[#7f6657]">
                No orders matched the selected filters.
              </div>
            ) : (
              orders.map((order) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => setSelectedOrderId(order.id)}
                  className="flex w-full flex-col gap-4 rounded-[1.4rem] border border-[#ebdfd5] bg-[#fffdfa] px-5 py-5 text-left transition duration-300 hover:-translate-y-0.5 hover:border-[#d7baa3] hover:shadow-[0_18px_40px_rgba(59,31,15,0.09)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a37d63]">
                        {order.orderCode}
                      </p>
                      <h3 className="mt-2 text-lg font-bold text-[#4d3020]">
                        {order.shopName}
                      </h3>
                      <p className="mt-2 text-sm text-[#7f6657]">
                        {order.territoryName || 'No territory'} -{' '}
                        {order.warehouseName || 'No warehouse'}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                        STATUS_BADGE[order.status] ??
                        'border border-[#d7baa3] bg-[#fff8f2] text-[#8b5a3a]'
                      }`}
                    >
                      {statusLabel(order.status)}
                    </span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="rounded-[1rem] border border-[#f0e2d6] bg-white px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#8a6c58]">
                        Placed
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[#4d3020]">
                        {formatDateTime(order.placedAt)}
                      </p>
                    </div>
                    <div className="rounded-[1rem] border border-[#f0e2d6] bg-white px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#8a6c58]">
                        Payment
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[#4d3020]">
                        {paymentMethodLabel(order.paymentMethod)}
                      </p>
                    </div>
                    <div className="rounded-[1rem] border border-[#f0e2d6] bg-white px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#8a6c58]">
                        Items
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[#4d3020]">
                        {order.itemCount} lines - {order.totalCases} cases
                      </p>
                    </div>
                    <div className="rounded-[1rem] border border-[#f0e2d6] bg-white px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#8a6c58]">
                        Final total
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[#4d3020]">
                        {formatCurrency(order.totalAfterDiscount ?? order.totalAmount)}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </article>

        <article className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">
            Quick snapshot
          </p>
          <div className="mt-5 grid gap-4">
            <div className="rounded-[1.35rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4">
              <p className="text-sm font-semibold text-[#8a6c58]">Visible orders</p>
              <p className="mt-2 text-[1.55rem] font-bold text-[#4d3020]">
                {loadingOrders ? '--' : orders.length}
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4">
              <p className="text-sm font-semibold text-[#8a6c58]">
                Discounted orders
              </p>
              <p className="mt-2 text-[1.55rem] font-bold text-[#4d3020]">
                {loadingOrders ? '--' : discountedOrders}
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4">
              <p className="text-sm font-semibold text-[#8a6c58]">Gross total</p>
              <p className="mt-2 text-[1.55rem] font-bold text-[#4d3020]">
                {loadingOrders ? '--' : formatCurrency(grossTotal)}
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4">
              <p className="text-sm font-semibold text-[#8a6c58]">Net total</p>
              <p className="mt-2 text-[1.55rem] font-bold text-[#4d3020]">
                {loadingOrders ? '--' : formatCurrency(netTotal)}
              </p>
            </div>
          </div>
        </article>
      </section>

      {selectedOrderId ? (
        <AdminOrderDetailsModal
          order={selectedOrder}
          loading={loadingDetail}
          error={detailError}
          onClose={() => {
            setSelectedOrderId(null)
            setSelectedOrder(null)
            setDetailError(null)
          }}
        />
      ) : null}
    </>
  )
}
