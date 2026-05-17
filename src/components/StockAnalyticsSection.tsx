import { useEffect, useState } from 'react'
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
import { fetchTmAnalytics, type WarehouseAnalytics } from '../api/tm'
import { fetchWarehouseAnalytics, fetchWarehouses, type WarehouseSummaryRecord } from '../api/warehouses'
import { getApiErrorMessage } from '../api/client'
import { formatCurrency } from '../pages/productsPage.helpers'

const surfaceClass =
  'rounded-[1.8rem] border border-[#ebdfd5] bg-white shadow-[0_20px_48px_rgba(59,31,15,0.08)]'

const CHART_COLORS = [
  '#8b5a3a', '#d97706', '#6366f1', '#10b981', '#f43f5e',
  '#0ea5e9', '#a855f7', '#84cc16', '#f97316', '#14b8a6',
]

const DAY_OPTIONS = [
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 },
]

function shortLabel(name: string, maxLen = 16) {
  return name.length > maxLen ? name.slice(0, maxLen - 1) + '…' : name
}

function mergeAnalytics(list: WarehouseAnalytics[]): WarehouseAnalytics {
  if (list.length === 0) return { products: [], orderTrend: [], productSummary: [], inventoryValue: [] }

  const productMap = new Map<string, { id: string; name: string }>()
  for (const a of list) for (const p of a.products) productMap.set(p.id, p)

  const trendMap = new Map<string, { orderCases: number; orderCount: number; inventorySnapshot: number | null }>()
  for (const a of list) {
    for (const point of a.orderTrend) {
      const existing = trendMap.get(point.date) ?? { orderCases: 0, orderCount: 0, inventorySnapshot: null }
      existing.orderCases += point.orderCases
      existing.orderCount += point.orderCount
      trendMap.set(point.date, existing)
    }
  }
  const orderTrend = Array.from(trendMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({ date, ...data }))

  const summaryMap = new Map<string, { productId: string; productName: string; casesOnHand: number; totalOrderedCases: number }>()
  for (const a of list) {
    for (const s of a.productSummary) {
      const ex = summaryMap.get(s.productId) ?? { productId: s.productId, productName: s.productName, casesOnHand: 0, totalOrderedCases: 0 }
      ex.casesOnHand += s.casesOnHand
      ex.totalOrderedCases += s.totalOrderedCases
      summaryMap.set(s.productId, ex)
    }
  }

  const valueMap = new Map<string, { productId: string; productName: string; stockValue: number }>()
  for (const a of list) {
    for (const v of a.inventoryValue) {
      const ex = valueMap.get(v.productId) ?? { productId: v.productId, productName: v.productName, stockValue: 0 }
      ex.stockValue += v.stockValue
      valueMap.set(v.productId, ex)
    }
  }

  return {
    products: Array.from(productMap.values()),
    orderTrend,
    productSummary: Array.from(summaryMap.values()),
    inventoryValue: Array.from(valueMap.values()),
  }
}

interface Props {
  isAdmin: boolean
}

export default function StockAnalyticsSection({ isAdmin }: Props) {
  const [analytics, setAnalytics] = useState<WarehouseAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [selectedDays, setSelectedDays] = useState(30)

  const [warehouses, setWarehouses] = useState<WarehouseSummaryRecord[]>([])
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('ALL')
  const [warehousesReady, setWarehousesReady] = useState(!isAdmin)

  // Load warehouse list (admin only)
  useEffect(() => {
    if (!isAdmin) return
    fetchWarehouses()
      .then((res) => {
        setWarehouses(res.warehouses)
      })
      .catch(() => {})
      .finally(() => setWarehousesReady(true))
  }, [isAdmin])

  // Load analytics whenever filters change
  useEffect(() => {
    if (!warehousesReady) return
    if (isAdmin && warehouses.length === 0) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const productParam = selectedProduct || undefined

    const fetches: Promise<{ analytics: WarehouseAnalytics }>[] = isAdmin
      ? selectedWarehouse === 'ALL'
        ? warehouses.map((w) => fetchWarehouseAnalytics(w.id, productParam, selectedDays))
        : [fetchWarehouseAnalytics(selectedWarehouse, productParam, selectedDays)]
      : [fetchTmAnalytics(productParam, selectedDays)]

    Promise.all(fetches)
      .then((results) => {
        const merged = results.length === 1 ? results[0].analytics : mergeAnalytics(results.map((r) => r.analytics))
        setAnalytics(merged)
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [isAdmin, warehouses, selectedWarehouse, selectedProduct, selectedDays, warehousesReady])

  const warehouseLabel =
    isAdmin && selectedWarehouse !== 'ALL'
      ? warehouses.find((w) => w.id === selectedWarehouse)?.name ?? ''
      : 'All Warehouses'

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

        {analytics && analytics.products.length > 0 && (
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
              {analytics.products.map((p) => (
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

      {loading && <p className="py-10 text-center text-sm text-[#7f6657]">Loading analytics...</p>}
      {error && <p className="py-10 text-center text-sm text-red-600">{error}</p>}
      {!loading && !error && isAdmin && warehouses.length === 0 && (
        <p className="py-10 text-center text-sm text-[#7f6657]">No warehouses found.</p>
      )}

      {!loading && !error && analytics && (
        <>
          {/* Line chart — Inventory Stock vs Order Cases over time */}
          <div className={`${surfaceClass} p-6`}>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#a37d63]">
              Trend over time
            </p>
            <h3 className="mb-4 text-base font-bold text-[#4d3020]">
              Inventory Stock &amp; Order Cases
              {selectedProduct
                ? ` · ${analytics.products.find((p) => p.id === selectedProduct)?.name ?? ''}`
                : ' · All Products'}
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={analytics.orderTrend} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1e5db" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#8a6c58' }}
                  tickFormatter={(v) => {
                    const d = new Date(v)
                    return `${d.getMonth() + 1}/${d.getDate()}`
                  }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 11, fill: '#8a6c58' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '0.85rem', borderColor: '#ebdfd5', fontSize: 12 }}
                  labelFormatter={(label) => new Date(label).toLocaleDateString()}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {selectedProduct && (
                  <Line
                    type="monotone"
                    dataKey="inventorySnapshot"
                    name="Inventory Stock (cases)"
                    stroke="#8b5a3a"
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
                  stroke="#d97706"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Grouped bar chart — Inventory vs Orders per product */}
          <div className={`${surfaceClass} p-6`}>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#a37d63]">
              Product breakdown
            </p>
            <h3 className="mb-4 text-base font-bold text-[#4d3020]">
              Inventory Cases vs Total Ordered Cases
            </h3>
            {analytics.productSummary.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#7f6657]">No inventory data available.</p>
            ) : (
              <div className="overflow-x-auto">
                <div style={{ minWidth: Math.max(400, analytics.productSummary.length * 60) }}>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart
                      data={analytics.productSummary.map((p) => ({
                        ...p,
                        shortName: shortLabel(p.productName),
                      }))}
                      margin={{ top: 4, right: 16, left: 0, bottom: 56 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1e5db" />
                      <XAxis
                        dataKey="shortName"
                        tick={{ fontSize: 10, fill: '#8a6c58' }}
                        angle={-35}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis tick={{ fontSize: 11, fill: '#8a6c58' }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: '0.85rem', borderColor: '#ebdfd5', fontSize: 12 }}
                        labelFormatter={(_, payload) =>
                          payload?.[0]?.payload?.productName ?? ''
                        }
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="casesOnHand" name="Inventory Cases" fill="#8b5a3a" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="totalOrderedCases" name="Total Ordered Cases" fill="#d97706" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Pie chart — Monetary value (admin only) */}
          {isAdmin && analytics.inventoryValue.length > 0 && (
            <div className={`${surfaceClass} p-6`}>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#a37d63]">
                Monetary value
              </p>
              <h3 className="mb-1 text-base font-bold text-[#4d3020]">
                Stock Value by Product
              </h3>
              <p className="mb-4 text-xs text-[#7f6657]">{warehouseLabel}</p>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={analytics.inventoryValue}
                    dataKey="stockValue"
                    nameKey="productName"
                    cx="50%"
                    cy="50%"
                    outerRadius={110}
                    label={({ name, percent }) =>
                      `${shortLabel(name, 12)} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {analytics.inventoryValue.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '0.85rem', borderColor: '#ebdfd5', fontSize: 12 }}
                    formatter={(value) => [formatCurrency(value as number), 'Stock Value']}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} formatter={(value) => shortLabel(value, 24)} />
                </PieChart>
              </ResponsiveContainer>

              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {[...analytics.inventoryValue]
                  .sort((a, b) => b.stockValue - a.stockValue)
                  .slice(0, 6)
                  .map((item, idx) => (
                    <div
                      key={item.productId}
                      className="flex items-center gap-3 rounded-[1rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-3"
                    >
                      <div
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ background: CHART_COLORS[idx % CHART_COLORS.length] }}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-[#4d3020]">{item.productName}</p>
                        <p className="text-xs text-[#7f6657]">{formatCurrency(item.stockValue)}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
