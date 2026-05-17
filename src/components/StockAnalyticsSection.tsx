import { useEffect, useState, useCallback } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { fetchMyWarehouse, fetchTmOrders, type TmInventoryItem, type TmOrder } from '../api/tm'
import {
  fetchWarehouses,
  fetchWarehouseDetails,
  type WarehouseSummaryRecord,
  type WarehouseInventoryRecord,
  type WarehouseOrderRecord,
} from '../api/warehouses'
import { getApiErrorMessage } from '../api/client'
import { formatCurrency } from '../pages/productsPage.helpers'

// ─── Constants ────────────────────────────────────────────────────────────────

const surfaceClass =
  'rounded-[1.8rem] border border-[#ebdfd5] bg-white shadow-[0_20px_48px_rgba(59,31,15,0.08)]'

const STOCK_COLOR = '#8b5a3a'
const ORDER_COLOR = '#d97706'
const PIE_COLORS = [STOCK_COLOR, ORDER_COLOR]

const DAY_OPTIONS = [
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 },
]

function shortLabel(name: string | undefined | null, max = 16) {
  if (!name) return '—'
  return name.length > max ? name.slice(0, max - 1) + '…' : name
}

// ─── Data types ───────────────────────────────────────────────────────────────

interface TrendPoint {
  date: string
  orderCases: number
  inventorySnapshot: number | null
}

interface ProductBar {
  productId: string
  productName: string
  casesOnHand: number
  orderedCases: number
}

interface PieSlice {
  name: string
  value: number
}

interface ProductOption {
  id: string
  name: string
}

interface ChartBundle {
  trend: TrendPoint[]
  bars: ProductBar[]
  pie: PieSlice[]          // always 2 elements for admin, empty for TM
  products: ProductOption[]
}

// ─── Data derivation helpers ──────────────────────────────────────────────────

function buildDateRange(days: number): string[] {
  const dates: string[] = []
  const today = new Date()
  for (let i = days; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    dates.push(d.toISOString().split('T')[0])
  }
  return dates
}

function tmChartBundle(
  inventory: TmInventoryItem[],
  orders: TmOrder[],
  selectedProductId: string,
  days: number,
): ChartBundle {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const recent = orders.filter((o) => new Date(o.placedAt) >= cutoff)

  // Trend — cases ordered per day, filtered by product
  const trendMap = new Map<string, number>()
  for (const order of recent) {
    const dateStr = order.placedAt.split('T')[0]
    const items = selectedProductId
      ? order.items.filter((i) => i.productId === selectedProductId)
      : order.items
    const cases = items.reduce((sum, i) => sum + i.quantity, 0)
    trendMap.set(dateStr, (trendMap.get(dateStr) ?? 0) + cases)
  }

  const selectedInv = selectedProductId
    ? inventory.find((i) => i.productId === selectedProductId)
    : null
  const snapshot = selectedInv?.quantityOnHand ?? null

  const trend: TrendPoint[] = buildDateRange(days).map((date) => ({
    date,
    orderCases: trendMap.get(date) ?? 0,
    inventorySnapshot: snapshot,
  }))

  // Bar chart — per product, inventory + ordered cases
  const productOrderMap = new Map<string, number>()
  for (const order of recent) {
    for (const item of order.items) {
      if (item.productId) {
        productOrderMap.set(
          item.productId,
          (productOrderMap.get(item.productId) ?? 0) + item.quantity,
        )
      }
    }
  }

  const bars: ProductBar[] = inventory.map((item) => ({
    productId: item.productId,
    productName: item.productName ?? '—',
    casesOnHand: item.quantityOnHand,
    orderedCases: productOrderMap.get(item.productId) ?? 0,
  }))

  const products: ProductOption[] = inventory.map((i) => ({
    id: i.productId,
    name: i.productName ?? '—',
  }))

  return { trend, bars, pie: [], products }
}

function adminChartBundle(
  inventories: WarehouseInventoryRecord[],
  orderRecords: WarehouseOrderRecord[],
  productOrderTotals: Record<string, number>,
  selectedProductId: string,
  days: number,
): ChartBundle {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const recent = orderRecords.filter((o) => new Date(o.placedAt) >= cutoff)

  // Trend — total cases per day (warehouse-level, no per-product breakdown in records)
  const trendMap = new Map<string, number>()
  for (const order of recent) {
    const dateStr = new Date(order.placedAt).toISOString().split('T')[0]
    trendMap.set(dateStr, (trendMap.get(dateStr) ?? 0) + order.totalCases)
  }

  const selectedInv = selectedProductId
    ? inventories.find((i) => i.productId === selectedProductId)
    : null
  const snapshot = selectedInv?.casesOnHand ?? null

  const trend: TrendPoint[] = buildDateRange(days).map((date) => ({
    date,
    orderCases: trendMap.get(date) ?? 0,
    inventorySnapshot: snapshot,
  }))

  // Bar chart — per product inventory + ordered cases from productOrderTotals
  const bars: ProductBar[] = inventories.map((item) => ({
    productId: item.productId,
    productName: item.productName,
    casesOnHand: item.casesOnHand,
    orderedCases: productOrderTotals[item.productId] ?? 0,
  }))

  // Pie chart — 2 segments: stock value vs order revenue
  const totalStockValue = inventories.reduce((sum, i) => sum + i.stockValue, 0)
  const totalRevenue = recent.reduce((sum, o) => sum + o.totalAmount, 0)

  const pie: PieSlice[] = [
    { name: 'Current Stock Value', value: Number(totalStockValue.toFixed(2)) },
    { name: 'Order Revenue', value: Number(totalRevenue.toFixed(2)) },
  ]

  const products: ProductOption[] = inventories.map((i) => ({
    id: i.productId,
    name: i.productName,
  }))

  return { trend, bars, pie, products }
}

function mergeAdminBundles(bundles: ChartBundle[], days: number): ChartBundle {
  // Merge trend by date
  const trendMap = new Map<string, number>()
  for (const b of bundles) {
    for (const point of b.trend) {
      trendMap.set(point.date, (trendMap.get(point.date) ?? 0) + point.orderCases)
    }
  }
  const trend: TrendPoint[] = buildDateRange(days).map((date) => ({
    date,
    orderCases: trendMap.get(date) ?? 0,
    inventorySnapshot: null, // no single product context in ALL view
  }))

  // Merge bars by productId
  const barMap = new Map<string, ProductBar>()
  for (const b of bundles) {
    for (const bar of b.bars) {
      const ex = barMap.get(bar.productId)
      if (ex) {
        ex.casesOnHand += bar.casesOnHand
        ex.orderedCases += bar.orderedCases
      } else {
        barMap.set(bar.productId, { ...bar })
      }
    }
  }
  const bars = Array.from(barMap.values())

  // Merge pie slices (both bundles have same 2-slot structure)
  const stockValue = bundles.reduce((sum, b) => sum + (b.pie[0]?.value ?? 0), 0)
  const revenue = bundles.reduce((sum, b) => sum + (b.pie[1]?.value ?? 0), 0)
  const pie: PieSlice[] = [
    { name: 'Current Stock Value', value: Number(stockValue.toFixed(2)) },
    { name: 'Order Revenue', value: Number(revenue.toFixed(2)) },
  ]

  // Deduplicate products
  const productMap = new Map<string, ProductOption>()
  for (const b of bundles) for (const p of b.products) productMap.set(p.id, p)
  const products = Array.from(productMap.values())

  return { trend, bars, pie, products }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  isAdmin: boolean
}

export default function StockAnalyticsSection({ isAdmin }: Props) {
  const [bundle, setBundle] = useState<ChartBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedProduct, setSelectedProduct] = useState('')
  const [selectedDays, setSelectedDays] = useState(30)

  // Admin warehouse state
  const [warehouses, setWarehouses] = useState<WarehouseSummaryRecord[]>([])
  const [selectedWarehouse, setSelectedWarehouse] = useState('ALL')
  const [warehousesLoaded, setWarehousesLoaded] = useState(!isAdmin)

  // Load warehouse list (admin only)
  useEffect(() => {
    if (!isAdmin) return
    fetchWarehouses()
      .then((res) => setWarehouses(res.warehouses))
      .catch(() => {})
      .finally(() => setWarehousesLoaded(true))
  }, [isAdmin])

  const loadData = useCallback(async () => {
    if (!warehousesLoaded) return
    if (isAdmin && warehouses.length === 0) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (!isAdmin) {
        // ── TM mode ──────────────────────────────────────────────────────────
        const [warehouseRes, ordersRes] = await Promise.all([
          fetchMyWarehouse(),
          fetchTmOrders(),
        ])
        setBundle(
          tmChartBundle(
            warehouseRes.warehouse.inventory,
            ordersRes.orders,
            selectedProduct,
            selectedDays,
          ),
        )
      } else {
        // ── Admin mode ────────────────────────────────────────────────────────
        const targets =
          selectedWarehouse === 'ALL' ? warehouses : warehouses.filter((w) => w.id === selectedWarehouse)

        const details = await Promise.all(
          targets.map((w) => fetchWarehouseDetails(w.id, 'ANNUALLY')),
        )

        const bundles = details.map((res) =>
          adminChartBundle(
            res.warehouse.inventory,
            res.warehouse.orders.records,
            res.warehouse.orders.productOrderTotals ?? {},
            selectedProduct,
            selectedDays,
          ),
        )

        setBundle(bundles.length === 1 ? bundles[0] : mergeAdminBundles(bundles, selectedDays))
      }
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [isAdmin, warehouses, selectedWarehouse, selectedProduct, selectedDays, warehousesLoaded])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // ─── Render ────────────────────────────────────────────────────────────────

  const warehouseLabel =
    selectedWarehouse === 'ALL'
      ? 'All Warehouses'
      : (warehouses.find((w) => w.id === selectedWarehouse)?.name ?? '')

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        {isAdmin && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#8a6c58]">
              Warehouse
            </label>
            <select
              value={selectedWarehouse}
              onChange={(e) => {
                setSelectedWarehouse(e.target.value)
                setSelectedProduct('')
              }}
              className="rounded-[0.85rem] border border-[#d7baa3] bg-white px-3 py-2 text-sm font-medium text-[#4d3020] focus:outline-none focus:ring-2 focus:ring-[#8b5a3a]/30"
            >
              <option value="ALL">All Warehouses</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {bundle && bundle.products.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#8a6c58]">
              Product
            </label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="rounded-[0.85rem] border border-[#d7baa3] bg-white px-3 py-2 text-sm font-medium text-[#4d3020] focus:outline-none focus:ring-2 focus:ring-[#8b5a3a]/30"
            >
              <option value="">All Products</option>
              {bundle.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-[#8a6c58]">
            Period
          </label>
          <select
            value={selectedDays}
            onChange={(e) => setSelectedDays(Number(e.target.value))}
            className="rounded-[0.85rem] border border-[#d7baa3] bg-white px-3 py-2 text-sm font-medium text-[#4d3020] focus:outline-none focus:ring-2 focus:ring-[#8b5a3a]/30"
          >
            {DAY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <p className="py-10 text-center text-sm text-[#7f6657]">Loading analytics…</p>
      )}
      {!loading && error && (
        <p className="py-10 text-center text-sm text-red-600">{error}</p>
      )}
      {!loading && !error && isAdmin && warehouses.length === 0 && (
        <p className="py-10 text-center text-sm text-[#7f6657]">No warehouses found.</p>
      )}

      {!loading && !error && bundle && (
        <>
          {/* ── Chart 1: Line chart ───────────────────────────────────────── */}
          <div className={`${surfaceClass} p-6`}>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#a37d63]">
              Trend over time
            </p>
            <h3 className="mb-4 text-base font-bold text-[#4d3020]">
              Inventory Stock &amp; Order Cases
              {selectedProduct
                ? ` · ${bundle.products.find((p) => p.id === selectedProduct)?.name ?? ''}`
                : ' · All Products'}
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={bundle.trend}
                margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1e5db" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#8a6c58' }}
                  tickFormatter={(v: string) => {
                    const d = new Date(v)
                    return `${d.getMonth() + 1}/${d.getDate()}`
                  }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 11, fill: '#8a6c58' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '0.85rem',
                    borderColor: '#ebdfd5',
                    fontSize: 12,
                  }}
                  labelFormatter={(label: string) => new Date(label).toLocaleDateString()}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {selectedProduct && (
                  <Line
                    type="monotone"
                    dataKey="inventorySnapshot"
                    name="Inventory Stock (cases)"
                    stroke={STOCK_COLOR}
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="5 3"
                    connectNulls
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="orderCases"
                  name="Order Cases"
                  stroke={ORDER_COLOR}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* ── Chart 2: Grouped bar chart ────────────────────────────────── */}
          <div className={`${surfaceClass} p-6`}>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#a37d63]">
              Product breakdown
            </p>
            <h3 className="mb-4 text-base font-bold text-[#4d3020]">
              Inventory Cases vs Total Ordered Cases per Product
            </h3>
            {bundle.bars.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#7f6657]">
                No inventory data available.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <div style={{ minWidth: Math.max(420, bundle.bars.length * 64) }}>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart
                      data={bundle.bars.map((b) => ({
                        ...b,
                        label: shortLabel(b.productName),
                      }))}
                      margin={{ top: 4, right: 16, left: 0, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1e5db" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: '#8a6c58' }}
                        angle={-35}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#8a6c58' }}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '0.85rem',
                          borderColor: '#ebdfd5',
                          fontSize: 12,
                        }}
                        labelFormatter={(_: unknown, payload: unknown[]) => {
                          const p = payload as Array<{ payload?: ProductBar }>
                          return p?.[0]?.payload?.productName ?? ''
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar
                        dataKey="casesOnHand"
                        name="Inventory Cases"
                        fill={STOCK_COLOR}
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="orderedCases"
                        name="Ordered Cases"
                        fill={ORDER_COLOR}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* ── Chart 3: Pie chart (admin only) ──────────────────────────── */}
          {isAdmin && bundle.pie.some((s) => s.value > 0) && (
            <div className={`${surfaceClass} p-6`}>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#a37d63]">
                Monetary value
              </p>
              <h3 className="mb-1 text-base font-bold text-[#4d3020]">
                Stock Value vs Order Revenue
              </h3>
              <p className="mb-4 text-xs text-[#7f6657]">{warehouseLabel}</p>

              <div className="flex flex-col gap-6 md:flex-row md:items-center">
                <div className="w-full md:w-1/2">
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={bundle.pie}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        innerRadius={48}
                        paddingAngle={3}
                      >
                        {bundle.pie.map((_, idx) => (
                          <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: '0.85rem',
                          borderColor: '#ebdfd5',
                          fontSize: 12,
                        }}
                        formatter={(value: number) => [
                          formatCurrency(value),
                          '',
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex flex-col gap-3 md:w-1/2">
                  {bundle.pie.map((slice, idx) => (
                    <div
                      key={slice.name}
                      className="flex items-center gap-4 rounded-[1.2rem] border border-[#eee2d7] bg-[#fff9f5] px-5 py-4"
                    >
                      <div
                        className="h-4 w-4 shrink-0 rounded-full"
                        style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }}
                      />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#8a6c58]">
                          {slice.name}
                        </p>
                        <p className="mt-0.5 text-[1.2rem] font-bold text-[#4d3020]">
                          {formatCurrency(slice.value)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
