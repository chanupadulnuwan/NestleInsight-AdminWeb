import { useEffect, useMemo, useState } from 'react'
import { getApiErrorMessage } from '../api/client'
import {
  downloadInsightCenterCsv,
  downloadInsightCenterPdf,
  fetchInsightCenterDashboard,
  type InsightCenterDashboard,
  type InsightCenterParams,
  type InsightExceptionRow,
  type InsightFilterOption,
  type InsightKpi,
  type InsightRecommendedActionRow,
  type InsightTrendPoint,
  type InsightWarehouseOption,
} from '../api/insightCenter'

const surfaceClassName =
  'rounded-[1.8rem] border border-[#ebdfd5] bg-white shadow-[0_20px_48px_rgba(59,31,15,0.08)]'

const tabs = [
  'Overview',
  'Demand Trends',
  'Forecast',
  'Promotions',
  'Competitors & Feedback',
  'Operations & Risks',
  'Shop / SKU Drilldown',
  'Report',
]

const periodLabelMap: Record<string, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  '180d': 'Last 6 months',
  '365d': 'Last 12 months',
  ytd: 'Year to date',
  custom: 'Custom range',
}

const today = new Date()
const defaultWindow = resolvePresetWindow('30d', today)

type SelectOption = InsightFilterOption

function formatNumber(value: number | null | undefined, maximumFractionDigits = 1) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '0'
  return value.toLocaleString(undefined, { maximumFractionDigits })
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'N/A'
  return `${Math.round(value * 100)}%`
}

function formatScore(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'N/A'
  return value > 1 ? `${Math.round(value)}` : `${Math.round(value * 100)}`
}

function formatOption(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatPeriodOption(value: string) {
  return periodLabelMap[value] ?? formatOption(value)
}

function toSelectOptions(
  values: string[],
  formatter: (value: string) => string = formatOption,
): SelectOption[] {
  return values.map((value) => ({
    value,
    label: formatter(value),
  }))
}

function formatKpiValue(kpi: InsightKpi) {
  if (kpi.unit === 'rate') return formatPercent(kpi.value)
  if (kpi.unit === 'score') return formatScore(kpi.value)
  return formatNumber(kpi.value)
}

function demandTypeLabel(value: 'REPLENISHMENT_DEMAND' | 'ESTIMATED_RETAIL_OFFTAKE') {
  return value === 'REPLENISHMENT_DEMAND' ? 'Replenishment' : 'Estimated Retail Offtake'
}

function sourceBadgeClassName(sourceType: InsightKpi['sourceType'] | string) {
  if (sourceType === 'exact')
    return 'border-[rgba(144,151,122,0.4)] bg-[rgba(144,151,122,0.14)] text-[#616a41]'
  if (sourceType === 'estimated') return 'border-[#e5d0a3] bg-[#fff8e7] text-[#80622b]'
  return 'border-[#c9d9de] bg-[#eef8fa] text-[#3d6e77]'
}

function severityClassName(severity: InsightExceptionRow['severity']) {
  if (severity === 'HIGH') return 'border-[#e5b8a8] bg-[#fff2ee] text-[#96513d]'
  if (severity === 'MEDIUM') return 'border-[#e6d2a5] bg-[#fff8e8] text-[#80612c]'
  return 'border-[rgba(144,151,122,0.38)] bg-[rgba(144,151,122,0.14)] text-[#616a41]'
}

function priorityClassName(priority: InsightRecommendedActionRow['priority']) {
  if (priority === 'HIGH') return 'border-[#e5b8a8] bg-[#fff2ee] text-[#96513d]'
  if (priority === 'MEDIUM') return 'border-[#e6d2a5] bg-[#fff8e8] text-[#80612c]'
  return 'border-[rgba(144,151,122,0.38)] bg-[rgba(144,151,122,0.14)] text-[#616a41]'
}

function downloadBlob(blob: Blob, filename: string) {
  const downloadUrl = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = downloadUrl
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 1000)
}

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10)
}

function addDays(base: Date, days: number) {
  const copy = new Date(base)
  copy.setDate(copy.getDate() + days)
  return copy
}

function resolvePresetWindow(period: string, referenceDate: Date) {
  const toDate = formatDateInput(referenceDate)
  if (period === 'custom') return { fromDate: '', toDate: '' }
  if (period === '7d') return { fromDate: formatDateInput(addDays(referenceDate, -6)), toDate }
  if (period === '90d') return { fromDate: formatDateInput(addDays(referenceDate, -89)), toDate }
  if (period === '180d') return { fromDate: formatDateInput(addDays(referenceDate, -179)), toDate }
  if (period === '365d') return { fromDate: formatDateInput(addDays(referenceDate, -364)), toDate }
  if (period === 'ytd') {
    return {
      fromDate: `${referenceDate.getFullYear()}-01-01`,
      toDate,
    }
  }
  return { fromDate: formatDateInput(addDays(referenceDate, -29)), toDate }
}

function sampleRows<T>(rows: T[], maxRows: number) {
  if (rows.length <= maxRows) return rows
  const sampled: T[] = []
  const seen = new Set<number>()
  for (let index = 0; index < maxRows; index += 1) {
    const rowIndex = Math.round((index * (rows.length - 1)) / (maxRows - 1))
    if (!seen.has(rowIndex)) {
      sampled.push(rows[rowIndex])
      seen.add(rowIndex)
    }
  }
  return sampled
}

export default function DemandPlannerInsightCenterSection() {
  const [period, setPeriod] = useState('30d')
  const [fromDate, setFromDate] = useState(defaultWindow.fromDate)
  const [toDate, setToDate] = useState(defaultWindow.toDate)
  const [granularity, setGranularity] = useState('daily')
  const [demandType, setDemandType] = useState('all')
  const [viewMode, setViewMode] = useState('absolute')
  const [confidenceLevel, setConfidenceLevel] = useState('all')
  const [compareMode, setCompareMode] = useState('previous_period')
  const [territoryId, setTerritoryId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [activeTab, setActiveTab] = useState('Overview')
  const [dashboard, setDashboard] = useState<InsightCenterDashboard | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDownloadingCsv, setIsDownloadingCsv] = useState(false)
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const buildParams = (): InsightCenterParams | null => {
    const trimmedFromDate = fromDate.trim()
    const trimmedToDate = toDate.trim()

    if (!trimmedFromDate || !trimmedToDate) {
      setError(
        'Select both from and to dates before refreshing the Insight Center or generating the report.',
      )
      setFeedback(null)
      return null
    }

    if (trimmedFromDate > trimmedToDate) {
      setError('From date cannot be after the to date.')
      setFeedback(null)
      return null
    }

    return {
      period,
      fromDate: trimmedFromDate,
      toDate: trimmedToDate,
      granularity,
      demandType,
      viewMode,
      confidenceLevel,
      compareMode,
      territoryId: territoryId || undefined,
      warehouseId: warehouseId || undefined,
    }
  }

  const loadDashboard = async () => {
    const params = buildParams()
    if (!params) return

    setIsLoading(true)
    setError(null)
    setFeedback(null)

    try {
      const data = await fetchInsightCenterDashboard(params)
      setDashboard(data)
      setFeedback('Insight Center refreshed with the latest demand, warehouse, and field-execution signals.')
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          'Unable to load the Demand Planner Insight Center right now.',
        ),
      )
    } finally {
      setIsLoading(false)
    }
  }

  const downloadCsv = async () => {
    const params = buildParams()
    if (!params) return

    setIsDownloadingCsv(true)
    setError(null)
    setFeedback(null)

    try {
      const { blob, filename } = await downloadInsightCenterCsv(params)
      downloadBlob(blob, filename)
      setFeedback(`${filename} is ready.`)
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          'Unable to download the Insight Center CSV report right now.',
        ),
      )
    } finally {
      setIsDownloadingCsv(false)
    }
  }

  const downloadPdf = async () => {
    const params = buildParams()
    if (!params) return

    setIsDownloadingPdf(true)
    setError(null)
    setFeedback(null)

    try {
      const { blob, filename } = await downloadInsightCenterPdf(params)
      downloadBlob(blob, filename)
      setFeedback(`${filename} is ready.`)
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          'Unable to download the Insight Center PDF report right now.',
        ),
      )
    } finally {
      setIsDownloadingPdf(false)
    }
  }

  useEffect(() => {
    void loadDashboard()
  }, [])

  const periodOptions = toSelectOptions(
    dashboard?.controls.periods ?? ['7d', '30d', '90d', '180d', '365d', 'ytd', 'custom'],
    formatPeriodOption,
  )
  const granularityOptions = toSelectOptions(
    dashboard?.controls.granularities ?? ['daily', 'weekly', 'monthly'],
  )
  const demandTypeOptions = toSelectOptions(
    dashboard?.controls.demandTypes ?? ['all', 'replenishment', 'estimated_retail_offtake'],
  )
  const viewModeOptions = toSelectOptions(
    dashboard?.controls.viewModes ?? ['absolute', 'normalized', 'confidence_adjusted'],
  )
  const confidenceLevelOptions = toSelectOptions(
    dashboard?.controls.confidenceLevels ?? ['all', 'high_only'],
  )
  const compareModeOptions = toSelectOptions(
    dashboard?.controls.compareModes ?? ['previous_period', 'previous_month', 'previous_year'],
  )

  const territoryOptions: SelectOption[] = [
    { value: '', label: 'All territories' },
    ...(dashboard?.controls.territories ?? []),
  ]
  const warehouseOptions: InsightWarehouseOption[] = [
    { value: '', label: 'All warehouses', territoryId: null },
    ...((dashboard?.controls.warehouses ?? []).filter(
      (option) => !territoryId || option.territoryId === territoryId,
    )),
  ]

  useEffect(() => {
    if (warehouseId && !warehouseOptions.some((option) => option.value === warehouseId)) {
      setWarehouseId('')
    }
  }, [warehouseId, warehouseOptions])

  const hasExplicitWindow = Boolean(fromDate && toDate)
  const selectedWindowLabel = hasExplicitWindow
    ? `${fromDate} to ${toDate}`
    : 'Select both from and to dates'

  const handlePeriodChange = (value: string) => {
    setPeriod(value)
    if (value === 'custom') {
      return
    }
    const nextWindow = resolvePresetWindow(value, new Date())
    setFromDate(nextWindow.fromDate)
    setToDate(nextWindow.toDate)
  }

  const handleFromDateChange = (value: string) => {
    if (period !== 'custom') {
      setPeriod('custom')
    }
    setFromDate(value)
  }

  const handleToDateChange = (value: string) => {
    if (period !== 'custom') {
      setPeriod('custom')
    }
    setToDate(value)
  }

  return (
    <div className="grid gap-6">
      <section className={`${surfaceClassName} overflow-hidden`}>
        <div className="border-b border-[#efe1d5] bg-[radial-gradient(circle_at_top_left,_rgba(144,151,122,0.22),_transparent_34%),linear-gradient(135deg,#fff8ec_0%,rgba(144,151,122,0.12)_52%,#ffffff_100%)] px-6 py-6 sm:px-7">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#616a41]">
            Demand Planner Insight Center
          </p>
          <h2 className="mt-3 text-[1.9rem] font-bold tracking-[-0.04em] text-[#2d423f]">
            Operational demand intelligence with field evidence kept visible
          </h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-[#657670]">
            Explore exact ordering, delivered fulfilment, estimated consumer movement, warehouse risk, shop-owner feedback, competitor pressure, OSA issues, and sales-rep observations. The PDF report now follows the selected date window and is meant to tell a clearer planning story.
          </p>
        </div>

        <div className="grid gap-4 px-6 py-6 sm:px-7 md:grid-cols-2 xl:grid-cols-4">
          <FilterSelect label="Time period" value={period} onChange={handlePeriodChange} options={periodOptions} />
          <FilterSelect label="Granularity" value={granularity} onChange={setGranularity} options={granularityOptions} />
          <FilterSelect label="Demand type" value={demandType} onChange={setDemandType} options={demandTypeOptions} />
          <FilterSelect label="View mode" value={viewMode} onChange={setViewMode} options={viewModeOptions} />
          <FilterSelect label="Confidence" value={confidenceLevel} onChange={setConfidenceLevel} options={confidenceLevelOptions} />
          <FilterSelect label="Compare mode" value={compareMode} onChange={setCompareMode} options={compareModeOptions} />
          <FilterSelect label="Territory" value={territoryId} onChange={setTerritoryId} options={territoryOptions} />
          <FilterSelect label="Warehouse" value={warehouseId} onChange={setWarehouseId} options={warehouseOptions} />
          <label className="space-y-2">
            <span className="text-sm font-semibold text-[#616a41]">From date</span>
            <input
              type="date"
              value={fromDate}
              onChange={(event) => handleFromDateChange(event.target.value)}
              className="w-full rounded-[1rem] border border-[#d6dfd8] bg-[#fffdfb] px-4 py-3 text-sm text-[#2f4540] outline-none transition duration-300 focus:border-[#90977a]"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-[#616a41]">To date</span>
            <input
              type="date"
              value={toDate}
              onChange={(event) => handleToDateChange(event.target.value)}
              className="w-full rounded-[1rem] border border-[#d6dfd8] bg-[#fffdfb] px-4 py-3 text-sm text-[#2f4540] outline-none transition duration-300 focus:border-[#90977a]"
            />
          </label>
          <div className="rounded-[1.25rem] border border-[#e5ddd4] bg-[#fff9f3] px-4 py-4 text-sm leading-7 text-[#6f5a48] xl:col-span-2">
            <p className="font-semibold text-[#616a41]">Report window</p>
            <p className="mt-2">
              Current window: <span className="font-semibold">{selectedWindowLabel}</span>
            </p>
            <p className="mt-2">
              PDF and CSV reports now require an explicit from/to date window, so the charts and actions follow the exact period you selected instead of falling back to repeated default content.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 border-t border-[#efe1d5] px-6 py-5 sm:px-7">
          <button
            type="button"
            onClick={() => void loadDashboard()}
            disabled={isLoading || !hasExplicitWindow}
            className="rounded-[1rem] bg-[#616a41] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(97,106,65,0.18)] transition duration-300 hover:bg-[#525937] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? 'Refreshing insights...' : 'Refresh insights'}
          </button>
          <button
            type="button"
            onClick={() => void downloadPdf()}
            disabled={isDownloadingPdf || !hasExplicitWindow}
            className="rounded-[1rem] border border-[rgba(144,151,122,0.45)] bg-white px-5 py-3 text-sm font-semibold text-[#616a41] transition duration-300 hover:border-[#616a41] hover:bg-[rgba(144,151,122,0.08)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isDownloadingPdf ? 'Preparing PDF...' : 'Download PDF'}
          </button>
          <button
            type="button"
            onClick={() => void downloadCsv()}
            disabled={isDownloadingCsv || !hasExplicitWindow}
            className="rounded-[1rem] border border-[rgba(144,151,122,0.45)] bg-white px-5 py-3 text-sm font-semibold text-[#616a41] transition duration-300 hover:border-[#616a41] hover:bg-[rgba(144,151,122,0.08)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isDownloadingCsv ? 'Preparing CSV...' : 'Download CSV'}
          </button>
        </div>

        {!hasExplicitWindow ? (
          <div className="border-t border-[#efe1d5] bg-[#fff2f1] px-6 py-4 text-sm text-[#92524b] sm:px-7">
            Select both from and to dates before generating the Insight Center report.
          </div>
        ) : null}

        {dashboard ? (
          <div className="border-t border-[#efe1d5] bg-[#fffaf4] px-6 py-4 text-sm leading-7 text-[#765d47] sm:px-7">
            <span className="font-semibold text-[#5b3e2b]">Data integrity note:</span>{' '}
            {dashboard.summary.dataIntegrityWarning}
          </div>
        ) : null}
      </section>

      {feedback ? (
        <div className="rounded-[1rem] border border-[rgba(144,151,122,0.4)] bg-[rgba(144,151,122,0.14)] px-4 py-3 text-sm text-[#616a41]">
          {feedback}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-[1rem] border border-[#ebc0bb] bg-[#fff2f1] px-4 py-3 text-sm text-[#92524b]">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {(dashboard?.kpis ?? []).map((kpi) => (
          <KpiCard key={kpi.key} kpi={kpi} />
        ))}
        {!dashboard ? (
          <div className={`${surfaceClassName} px-5 py-5 text-sm text-[#7f6657] xl:col-span-5`}>
            Loading the Insight Center snapshot...
          </div>
        ) : null}
      </section>

      <section className={`${surfaceClassName} overflow-hidden`}>
        <div className="flex gap-2 overflow-x-auto border-b border-[#efe1d5] px-4 py-4">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition duration-300 ${
                activeTab === tab
                  ? 'bg-[#616a41] text-white shadow-[0_12px_28px_rgba(97,106,65,0.16)]'
                  : 'bg-[#f7eee7] text-[#6f5a48] hover:bg-[#efe2d8]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="px-6 py-6 sm:px-7">
          {activeTab === 'Overview' ? <OverviewTab dashboard={dashboard} /> : null}
          {activeTab === 'Demand Trends' ? <DemandTrendsTab dashboard={dashboard} /> : null}
          {activeTab === 'Forecast' ? <ForecastTab dashboard={dashboard} /> : null}
          {activeTab === 'Promotions' ? <PromotionsTab dashboard={dashboard} /> : null}
          {activeTab === 'Competitors & Feedback' ? <CompetitorsTab dashboard={dashboard} /> : null}
          {activeTab === 'Operations & Risks' ? <OperationsTab dashboard={dashboard} /> : null}
          {activeTab === 'Shop / SKU Drilldown' ? <DrilldownTab dashboard={dashboard} /> : null}
          {activeTab === 'Report' ? (
            <ReportTab
              dashboard={dashboard}
              selectedWindowLabel={selectedWindowLabel}
              hasExplicitWindow={hasExplicitWindow}
              onDownloadCsv={() => void downloadCsv()}
              onDownloadPdf={() => void downloadPdf()}
              isDownloadingCsv={isDownloadingCsv}
              isDownloadingPdf={isDownloadingPdf}
            />
          ) : null}
        </div>
      </section>
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-[#616a41]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[1rem] border border-[#d6dfd8] bg-[#fffdfb] px-4 py-3 text-sm text-[#2f4540] outline-none transition duration-300 focus:border-[#90977a]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function KpiCard({ kpi }: { kpi: InsightKpi }) {
  return (
    <article className={`${surfaceClassName} px-5 py-5`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-[#61736d]">{kpi.label}</p>
        <span
          className={`rounded-full border px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] ${sourceBadgeClassName(kpi.sourceType)}`}
        >
          {kpi.sourceType}
        </span>
      </div>
      <p className="mt-3 text-[1.65rem] font-bold tracking-[-0.04em] text-[#2f4540]">
        {formatKpiValue(kpi)}
      </p>
      <p className="mt-2 text-xs leading-5 text-[#7b8a84]">{kpi.caption}</p>
      {kpi.confidenceScore !== null ? (
        <p className="mt-3 text-xs font-semibold text-[#616a41]">
          Confidence {formatPercent(kpi.confidenceScore)}
        </p>
      ) : null}
    </article>
  )
}

function OverviewTab({ dashboard }: { dashboard: InsightCenterDashboard | null }) {
  const hotspotRows = dashboard?.charts.territoryHeatmap.slice(0, 5) ?? []
  const warehouseRiskRows = dashboard?.charts.warehouseRisk.slice(0, 4) ?? []
  const recommendedActions = dashboard?.charts.recommendedActions.slice(0, 5) ?? []

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div className="grid gap-6">
        <DetailCardsPanel
          title="AI Summary"
          description="These summary lines explain the main demand, warehouse, and execution story of the selected window."
          rows={(dashboard?.summary.aiSummary ?? []).map((summary, index) => ({
            key: `summary-${index}`,
            title: `Insight ${index + 1}`,
            value: '',
            detail: summary,
          }))}
          emptyMessage="Loading insight summary..."
        />
        <ActionPanel rows={recommendedActions} />
      </div>

      <div className="grid gap-6">
        <DetailCardsPanel
          title="Top Demand Hotspots"
          description="These territory and product combinations show the strongest gap, stockout pressure, or confidence risk in the selected period."
          rows={hotspotRows.map((row) => ({
            key: `${row.territory_id ?? 'none'}-${row.product_id}`,
            title: `${row.territory_name} / ${row.product_name}`,
            value: `${formatNumber(row.demand_gap_cases)} gap`,
            detail: `${row.stockout_count} stockouts | ${formatNumber(row.estimated_retail_offtake_cases)} est. sales | ${formatPercent(row.confidence_score)} confidence`,
          }))}
          emptyMessage="No hotspot rows are available for this window."
        />
        <DetailCardsPanel
          title="Warehouse Risk Snapshot"
          description="These warehouses are carrying the strongest mix of delivery gap, stockout pressure, damage, and warehouse-reported issues."
          rows={warehouseRiskRows.map((row) => ({
            key: row.warehouse_name,
            title: row.warehouse_name,
            value: `Risk ${formatNumber(row.risk_score)}`,
            detail: `${formatNumber(row.delivery_gap_cases)} delivery gap | ${row.stockout_count} stockouts | ${formatNumber(row.damage_units)} damaged units`,
          }))}
          emptyMessage="No warehouse risk rows are available for this window."
        />
      </div>
    </div>
  )
}

function DemandTrendsTab({ dashboard }: { dashboard: InsightCenterDashboard | null }) {
  const trendRows = dashboard?.charts.trend ?? []
  const movementRows = [
    ...(dashboard?.charts.productMomentum.highest.slice(0, 4).map((row) => ({
      label: `Highest: ${row.product_name}`,
      value: row.demand_signal_cases,
      detail: `Orders ${formatNumber(row.ordered_cases)} | Customer sales ${formatNumber(row.estimated_retail_offtake_cases)}`,
    })) ?? []),
    ...(dashboard?.charts.productMomentum.lowest.slice(0, 4).map((row) => ({
      label: `Lowest: ${row.product_name}`,
      value: row.demand_signal_cases,
      detail: `Orders ${formatNumber(row.ordered_cases)} | Customer sales ${formatNumber(row.estimated_retail_offtake_cases)}`,
    })) ?? []),
  ]

  return (
    <div className="grid gap-6">
      <TrendLineChart rows={trendRows} />
      <div className="grid gap-6 xl:grid-cols-2">
        <SingleMetricBarsPanel
          title="Customer sales by product"
          description="Estimated Retail Offtake by product in the selected window."
          rows={dashboard?.charts.customerSalesByProduct ?? []}
          getKey={(row) => row.product_id}
          getLabel={(row) => row.product_name}
          getValue={(row) => row.estimated_retail_offtake_cases}
          getDetail={(row) => `Confidence ${formatPercent(row.confidence_score)}`}
          emptyMessage="No customer-sales rows are available yet."
          colorClassName="bg-[#616a41]"
          suffix="cases"
        />
        <SingleMetricBarsPanel
          title="Top and bottom product movers"
          description="These products are ranked by visible demand signal in the selected window."
          rows={movementRows}
          getKey={(row) => row.label}
          getLabel={(row) => row.label}
          getValue={(row) => row.value}
          getDetail={(row) => row.detail}
          emptyMessage="No product-movement rows are available yet."
          colorClassName="bg-[#8f6a3c]"
          suffix="cases"
        />
      </div>
      <DualMetricBarsPanel
        title="Ordering versus customer sales"
        description="This helps the planner see where shop ordering is running ahead of, or behind, estimated customer pull."
        rows={dashboard?.charts.orderVsCustomerSales ?? []}
        getKey={(row) => row.product_id}
        getLabel={(row) => row.product_name}
        getLeftValue={(row) => row.ordered_cases}
        getRightValue={(row) => row.estimated_retail_offtake_cases}
        getDetail={(row) => `Gap ${formatNumber(row.gap_cases)} cases`}
        leftLabel="Orders"
        rightLabel="Customer sales"
        leftColorClassName="bg-[#616a41]"
        rightColorClassName="bg-[#d49a45]"
        emptyMessage="No order-versus-customer-sales rows are available."
      />
    </div>
  )
}

function ForecastTab({ dashboard }: { dashboard: InsightCenterDashboard | null }) {
  const accuracyRows = dashboard?.charts.actualVsForecast.slice(0, 10) ?? []
  const waterfallRows = dashboard?.charts.waterfall ?? []
  const exceptionRows = dashboard?.charts.exceptions.slice(0, 8) ?? []

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <TablePanel
        title="Actual vs Forecast"
        description="Lower WAPE means the forecast was closer to actual movement. This table helps planners see where the model is most and least trustworthy."
        rows={accuracyRows}
        columns={[
          { key: 'product_name', label: 'Product' },
          { key: 'demand_type', label: 'Type', render: (row) => demandTypeLabel(row.demand_type) },
          { key: 'actual_cases', label: 'Actual', render: (row) => formatNumber(row.actual_cases) },
          { key: 'forecast_cases', label: 'Forecast', render: (row) => formatNumber(row.forecast_cases) },
          { key: 'wape', label: 'WAPE', render: (row) => formatPercent(row.wape) },
        ]}
        getKey={(row) => `${row.demand_type}-${row.product_id}-${row.territory_id ?? 'none'}`}
        emptyMessage="Backtesting needs more historical demand points."
      />
      <DetailCardsPanel
        title="Forecast movement drivers"
        description="This shows what is lifting or dragging the current forecast view."
        rows={waterfallRows.map((row) => ({
          key: row.driver,
          title: row.driver,
          value: `${formatNumber(row.cases)} cases`,
          detail: row.direction === 'down' ? 'Downward pressure on the forecast.' : 'Supports current forecast direction.',
        }))}
        emptyMessage="No forecast driver rows are available."
      />
      <article className="xl:col-span-2">
        <div className="grid gap-3 md:grid-cols-2">
          {exceptionRows.map((row) => (
            <div
              key={`${row.exception_type}-${row.reason}`}
              className={`rounded-[1.1rem] border px-4 py-4 text-sm ${severityClassName(row.severity)}`}
            >
              <p className="font-semibold">{row.exception_type}</p>
              <p className="mt-2 leading-6">{row.reason}</p>
              <p className="mt-3 font-semibold">Action: {row.recommended_action}</p>
            </div>
          ))}
          {exceptionRows.length === 0 ? (
            <EmptyState message="No forecast exceptions surfaced for this window." />
          ) : null}
        </div>
      </article>
    </div>
  )
}

function PromotionsTab({ dashboard }: { dashboard: InsightCenterDashboard | null }) {
  const demandSplitRows = dashboard?.charts.demandSplit ?? []

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <DualMetricBarsPanel
          title="Promotion impact on orders and customer sales"
          description="This compares baseline, promotion-active, and uplift phases in the current window."
          rows={dashboard?.charts.promotionImpact ?? []}
          getKey={(row) => row.phase}
          getLabel={(row) => row.phase}
          getLeftValue={(row) => row.ordered_cases}
          getRightValue={(row) => row.estimated_retail_offtake_cases}
          leftLabel="Orders"
          rightLabel="Customer sales"
          leftColorClassName="bg-[#616a41]"
          rightColorClassName="bg-[#d49a45]"
          emptyMessage="No promotion impact rows are available."
        />
        <SingleMetricBarsPanel
          title="Demand composition"
          description="This shows how much of the window is driven by exact ordering, returns, backorders, and estimated consumer movement."
          rows={demandSplitRows}
          getKey={(row) => row.segment}
          getLabel={(row) => row.segment}
          getValue={(row) => row.cases}
          getDetail={(row) => `Source ${row.source_type}`}
          emptyMessage="No demand-composition rows are available."
          colorClassName="bg-[#d49a45]"
          suffix="cases"
        />
      </div>
      <DualMetricBarsPanel
        title="Products most affected by promotions"
        description="This focuses only on promoted movement, so the planner can see which products are reacting most strongly while promotions are active."
        rows={dashboard?.charts.promotionProductImpact ?? []}
        getKey={(row) => row.product_id}
        getLabel={(row) => row.product_name}
        getLeftValue={(row) => row.promoted_ordered_cases}
        getRightValue={(row) => row.promoted_estimated_retail_offtake_cases}
        getDetail={(row) => `Total orders ${formatNumber(row.total_ordered_cases)} | Total customer sales ${formatNumber(row.total_estimated_retail_offtake_cases)}`}
        leftLabel="Promoted orders"
        rightLabel="Promoted customer sales"
        leftColorClassName="bg-[#616a41]"
        rightColorClassName="bg-[#d49a45]"
        emptyMessage="No promotion-product rows are available."
      />
    </div>
  )
}

function CompetitorsTab({ dashboard }: { dashboard: InsightCenterDashboard | null }) {
  const competitorPressureRows = dashboard?.charts.competitorPressure ?? []

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <DualMetricBarsPanel
          title="Competitor pressure versus our sales"
          description="Each row compares our visible orders and estimated customer sales in territories where competitor mentions are coming through field reports."
          rows={dashboard?.charts.competitorRiskVsSales ?? []}
          getKey={(row) => row.label}
          getLabel={(row) => row.label}
          getLeftValue={(row) => row.ordered_cases}
          getRightValue={(row) => row.estimated_retail_offtake_cases}
          getDetail={(row) => `${row.competitor_mentions} competitor mentions`}
          leftLabel="Orders"
          rightLabel="Customer sales"
          leftColorClassName="bg-[#616a41]"
          rightColorClassName="bg-[#d49a45]"
          emptyMessage="No competitor risk rows are available."
        />
        <SingleMetricBarsPanel
          title="Competitor pressure count"
          description="This highlights where competitor mentions are most frequently surfacing in the selected window."
          rows={competitorPressureRows}
          getKey={(row) => row.label}
          getLabel={(row) => row.label}
          getValue={(row) => row.mentions}
          getDetail={(row) => `${row.high_severity} high-severity mentions`}
          emptyMessage="No competitor pressure signals were captured in this window."
          colorClassName="bg-[#b6793f]"
          suffix="mentions"
        />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <SingleMetricBarsPanel
          title="Shop-owner feedback themes"
          description="These are the recurring themes appearing in feedback and comments captured during the selected period."
          rows={dashboard?.charts.feedbackThemes ?? []}
          getKey={(row) => row.theme}
          getLabel={(row) => row.theme}
          getValue={(row) => row.count}
          getDetail={() => 'Theme count from shop-owner or field feedback text.'}
          emptyMessage="No feedback themes have been detected yet."
          colorClassName="bg-[#b6793f]"
          suffix="mentions"
        />
        <DetailCardsPanel
          title="Most dissatisfied shop owners"
          description="These accounts have the weakest ratings or most concerning recent comments in the selected window."
          rows={(dashboard?.charts.dissatisfiedShops ?? []).map((row) => ({
            key: `${row.shop_name}-${row.warehouse_name}`,
            title: row.shop_name,
            value: `${formatNumber(row.average_rating)} / 5`,
            detail: `${row.territory_name} | ${row.warehouse_name} | ${row.feedback_count} feedbacks${row.latest_comment ? ` | ${row.latest_comment}` : ''}`,
          }))}
          emptyMessage="No dissatisfied-shop rows are available."
        />
      </div>
    </div>
  )
}

function OperationsTab({ dashboard }: { dashboard: InsightCenterDashboard | null }) {
  return (
    <div className="grid gap-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <SingleMetricBarsPanel
          title="Most damaged or expired products"
          description="Higher bars indicate products repeatedly flagged by sales reps for damage or expiry."
          rows={dashboard?.charts.damageByProduct ?? []}
          getKey={(row) => row.product_id ?? row.product_name}
          getLabel={(row) => row.product_name}
          getValue={(row) => row.total_loss_units}
          getDetail={(row) => `Damaged ${formatNumber(row.damaged_units)} | Expired ${formatNumber(row.expired_units)}`}
          emptyMessage="No product-damage rows are available."
          colorClassName="bg-[#a76d4c]"
          suffix="units"
        />
        <SingleMetricBarsPanel
          title="Warehouses linked to repeated damage"
          description="This shows which warehouses keep surfacing in damaged or expired unit evidence."
          rows={dashboard?.charts.damageByWarehouse ?? []}
          getKey={(row) => row.warehouse_id ?? row.warehouse_name}
          getLabel={(row) => row.warehouse_name}
          getValue={(row) => row.total_loss_units}
          getDetail={(row) => `${row.affected_products} products affected`}
          emptyMessage="No warehouse-damage rows are available."
          colorClassName="bg-[#8e6a3b]"
          suffix="units"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SingleMetricBarsPanel
          title="OSA issues captured by sales reps"
          description="These are the most repeated on-shelf availability issues observed during store visits."
          rows={dashboard?.charts.osaIssues ?? []}
          getKey={(row) => `${row.issue_type}-${row.product_name ?? row.label}-${row.warehouse_name}`}
          getLabel={(row) => row.label}
          getValue={(row) => row.issue_count}
          getDetail={(row) => `${row.affected_outlets} outlets | ${row.warehouse_name}`}
          emptyMessage="No OSA issue rows are available."
          colorClassName="bg-[#d49a45]"
          suffix="issues"
        />
        <DetailCardsPanel
          title="Stockout impact"
          description="These products or territories show the strongest hidden-demand risk due to observed stockouts."
          rows={(dashboard?.charts.stockoutImpact ?? []).map((row) => ({
            key: `${row.territory_name}-${row.product_id}`,
            title: `${row.product_name} | ${row.territory_name}`,
            value: `${row.stockout_count} stockouts`,
            detail: `${formatNumber(row.estimated_lost_demand_cases)} estimated lost-demand cases`,
          }))}
          emptyMessage="No stockout impact rows are available."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SingleMetricBarsPanel
          title="Shops violating marketing rules"
          description="These shops are repeatedly failing planogram or POSM execution checks during store visits."
          rows={dashboard?.charts.complianceViolations ?? []}
          getKey={(row) => `${row.shop_name}-${row.warehouse_name}`}
          getLabel={(row) => row.shop_name}
          getValue={(row) => row.violation_count}
          getDetail={(row) =>
            `${row.territory_name} | ${row.warehouse_name} | Rules broken: ${row.violated_rules.join(', ')} | ${row.planogram_failures} planogram / ${row.posm_failures} POSM`
          }
          emptyMessage="No compliance violations were captured in this window."
          colorClassName="bg-[#b6793f]"
          suffix="violations"
        />
        <SingleMetricBarsPanel
          title="Sales-rep report issues"
          description="These rows summarize the sales reps carrying the heaviest route, warehouse, or market-execution burden in the selected window."
          rows={dashboard?.charts.salesRepIssues ?? []}
          getKey={(row) => `${row.sales_rep_name}-${row.warehouse_name}`}
          getLabel={(row) => row.sales_rep_name}
          getValue={(row) => row.issue_count}
          getDetail={(row) =>
            `${row.territory_name} | ${row.warehouse_name} | ${row.critical_count} critical | dominant issue ${row.dominant_issue}`
          }
          emptyMessage="No sales-rep issue rows are available."
          colorClassName="bg-[#8e6a3b]"
          suffix="issues"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SingleMetricBarsPanel
          title="Warehouse risk watchlist"
          description="These warehouses combine delivery gaps, stockouts, product loss, and warehouse-reported issues into a single operational watchlist."
          rows={dashboard?.charts.warehouseRisk ?? []}
          getKey={(row) => row.warehouse_name}
          getLabel={(row) => row.warehouse_name}
          getValue={(row) => row.risk_score}
          getDetail={(row) =>
            `${formatNumber(row.delivery_gap_cases)} delivery gap | ${row.stockout_count} stockouts | ${formatNumber(row.damage_units)} damaged units | ${row.warehouse_issue_count} warehouse issues`
          }
          emptyMessage="No warehouse risk rows are available."
          colorClassName="bg-[#8e6a3b]"
          suffix="risk"
        />
        <DetailCardsPanel
          title="Visit coverage and confidence"
          description="These rows show whether the territory was covered often enough for the estimated retail signals to be trusted."
          rows={(dashboard?.charts.visitCoverageConfidence ?? []).map((row) => ({
            key: row.territory_id ?? row.territory_name,
            title: row.territory_name,
            value: formatPercent(row.confidence_score),
            detail: `${row.active_outlets} active outlets | ${row.visit_count} visits | ${row.days_since_last_visit ?? 'N/A'} days since last visit`,
          }))}
          emptyMessage="No visit-coverage rows are available."
        />
      </div>
    </div>
  )
}

function DrilldownTab({ dashboard }: { dashboard: InsightCenterDashboard | null }) {
  const rows = dashboard?.drilldowns ?? []

  return (
    <div className="grid gap-6">
      <div className="rounded-[1.25rem] border border-[rgba(144,151,122,0.28)] bg-[rgba(144,151,122,0.12)] px-4 py-4 text-sm leading-7 text-[#5c684c]">
        This drilldown shows shop and SKU combinations with the clearest fulfilment gap or confidence risk. It helps explain which outlet and product combinations are driving the larger dashboard patterns.
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[#e2ece8] text-xs uppercase tracking-[0.14em] text-[#789088]">
            <tr>
              <th className="py-3 pr-4">Shop</th>
              <th className="py-3 pr-4">SKU</th>
              <th className="py-3 pr-4">Ordered</th>
              <th className="py-3 pr-4">Delivered</th>
              <th className="py-3 pr-4">Customer sales</th>
              <th className="py-3 pr-4">Gap</th>
              <th className="py-3 pr-4">Confidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#edf2ee] text-[#465c56]">
            {rows.map((row) => (
              <tr key={`${row.shop_name}-${row.product_name}`}>
                <td className="py-3 pr-4 font-semibold">{row.shop_name}</td>
                <td className="py-3 pr-4">{row.product_name}</td>
                <td className="py-3 pr-4">{formatNumber(row.ordered_cases)}</td>
                <td className="py-3 pr-4">{formatNumber(row.delivered_cases)}</td>
                <td className="py-3 pr-4">{formatNumber(row.estimated_retail_offtake_cases)}</td>
                <td className="py-3 pr-4">{formatNumber(row.demand_gap_cases)}</td>
                <td className="py-3 pr-4">{formatPercent(row.confidence_score)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <EmptyState message="No shop / SKU drilldown rows are available yet." /> : null}
      </div>
    </div>
  )
}

function ReportTab({
  dashboard,
  selectedWindowLabel,
  hasExplicitWindow,
  onDownloadCsv,
  onDownloadPdf,
  isDownloadingCsv,
  isDownloadingPdf,
}: {
  dashboard: InsightCenterDashboard | null
  selectedWindowLabel: string
  hasExplicitWindow: boolean
  onDownloadCsv: () => void
  onDownloadPdf: () => void
  isDownloadingCsv: boolean
  isDownloadingPdf: boolean
}) {
  const reportSections = [
    'Executive summary tied to the selected date window',
    'Demand, fulfilment, and customer-sales trend charts',
    'Promotion impact and promotion-product response',
    'Damage, OSA, competitor, and feedback evidence',
    'Warehouse risk, sales-rep issues, compliance, and action watchlists',
  ]

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <article className="rounded-[1.35rem] border border-[rgba(144,151,122,0.28)] bg-[rgba(144,151,122,0.12)] px-5 py-5">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#616a41]">
          Report scope
        </p>
        <p className="mt-3 text-sm leading-7 text-[#5c684c]">
          Selected window: <span className="font-semibold">{selectedWindowLabel}</span>
        </p>
        <p className="mt-2 text-sm leading-7 text-[#5c684c]">
          Reports are blocked until both from and to dates are selected, so the dashboard and the PDF stay aligned with the exact period you want to review.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onDownloadPdf}
            disabled={isDownloadingPdf || !hasExplicitWindow}
            className="rounded-[1rem] bg-[#616a41] px-5 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-[#525937] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isDownloadingPdf ? 'Preparing PDF...' : 'Download PDF'}
          </button>
          <button
            type="button"
            onClick={onDownloadCsv}
            disabled={isDownloadingCsv || !hasExplicitWindow}
            className="rounded-[1rem] border border-[rgba(144,151,122,0.45)] bg-white px-5 py-3 text-sm font-semibold text-[#616a41] transition duration-300 hover:border-[#616a41] hover:bg-[rgba(144,151,122,0.08)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isDownloadingCsv ? 'Preparing CSV...' : 'Download CSV'}
          </button>
        </div>
      </article>

      <article className="grid gap-3">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#616a41]">
          What the PDF includes
        </p>
        {reportSections.map((section) => (
          <div
            key={section}
            className="rounded-[1.15rem] border border-[#eee2d7] bg-[#fffaf5] px-4 py-4 text-sm leading-7 text-[#6f5a48]"
          >
            {section}
          </div>
        ))}
        {(dashboard?.charts.recommendedActions ?? []).slice(0, 3).map((row) => (
          <div
            key={row.title}
            className="rounded-[1.15rem] border border-[rgba(144,151,122,0.28)] bg-[rgba(144,151,122,0.12)] px-4 py-4 text-sm leading-7 text-[#5c684c]"
          >
            <span className="font-semibold text-[#616a41]">{row.title}</span>
            {' | '}
            {row.reason}
          </div>
        ))}
      </article>
    </div>
  )
}

function TrendLineChart({ rows }: { rows: InsightTrendPoint[] }) {
  const sampledRows = useMemo(() => sampleRows(rows, 12), [rows])

  if (sampledRows.length === 0) {
    return <EmptyState message="No trend rows are available yet." />
  }

  const width = 880
  const height = 300
  const padding = { top: 18, right: 20, bottom: 54, left: 52 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom
  const maxValue = Math.max(
    1,
    ...sampledRows.flatMap((row) => [
      row.display_ordered_cases,
      row.display_delivered_cases,
      row.display_estimated_retail_offtake_cases,
      row.display_forecast_cases,
    ]),
  )

  const series = [
    { key: 'display_ordered_cases' as const, label: 'Orders', color: '#616a41' },
    { key: 'display_delivered_cases' as const, label: 'Deliveries', color: '#90977a' },
    { key: 'display_estimated_retail_offtake_cases' as const, label: 'Customer sales', color: '#d49a45' },
    { key: 'display_forecast_cases' as const, label: 'Forecast', color: '#5978a7' },
  ]

  const pointX = (index: number) =>
    padding.left + (sampledRows.length === 1 ? plotWidth / 2 : (plotWidth / (sampledRows.length - 1)) * index)
  const pointY = (value: number) => padding.top + plotHeight - (value / maxValue) * plotHeight

  const buildPath = (key: (typeof series)[number]['key']) =>
    sampledRows
      .map((row, index) => `${index === 0 ? 'M' : 'L'} ${pointX(index)} ${pointY(row[key])}`)
      .join(' ')

  const tickValues = [1, 0.66, 0.33, 0].map((multiplier) => ({
    label: formatNumber(maxValue * multiplier),
    y: padding.top + plotHeight - plotHeight * multiplier,
  }))

  const labelIndexes = [...new Set([0, Math.floor((sampledRows.length - 1) / 3), Math.floor(((sampledRows.length - 1) * 2) / 3), sampledRows.length - 1])]

  return (
    <article className={`${surfaceClassName} px-5 py-5`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#616a41]">
            Demand and fulfilment trend
          </p>
          <h3 className="mt-2 text-[1.4rem] font-bold tracking-[-0.03em] text-[#2f4540]">
            Orders, deliveries, customer sales, and forecast over time
          </h3>
          <p className="mt-2 text-sm leading-7 text-[#657670]">
            Y axis shows cases. X axis shows the selected time buckets across the report window.
          </p>
        </div>
      </div>
      <div className="mt-5 overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[760px]">
          {tickValues.map((tick) => (
            <g key={tick.label}>
              <line
                x1={padding.left}
                y1={tick.y}
                x2={width - padding.right}
                y2={tick.y}
                stroke="#e5eee9"
                strokeWidth="1"
              />
              <text
                x={padding.left - 10}
                y={tick.y + 4}
                textAnchor="end"
                fontSize="11"
                fill="#6b7f79"
              >
                {tick.label}
              </text>
            </g>
          ))}

          {series.map((item) => (
            <g key={item.key}>
              <path d={buildPath(item.key)} fill="none" stroke={item.color} strokeWidth="3" />
              {sampledRows.map((row, index) => (
                <circle
                  key={`${item.key}-${row.date}`}
                  cx={pointX(index)}
                  cy={pointY(row[item.key])}
                  r="3.5"
                  fill={item.color}
                />
              ))}
            </g>
          ))}

          {labelIndexes.map((index) => (
            <text
              key={sampledRows[index]?.date}
              x={pointX(index)}
              y={height - 16}
              textAnchor="middle"
              fontSize="11"
              fill="#6b7f79"
            >
              {sampledRows[index]?.label ?? sampledRows[index]?.date}
            </text>
          ))}
        </svg>
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold text-[#5d6d60]">
        {series.map((item) => (
          <div key={item.key} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </article>
  )
}

function DualMetricBarsPanel<T>({
  title,
  description,
  rows,
  getKey,
  getLabel,
  getLeftValue,
  getRightValue,
  leftLabel,
  rightLabel,
  leftColorClassName,
  rightColorClassName,
  getDetail,
  emptyMessage,
}: {
  title: string
  description: string
  rows: T[]
  getKey: (row: T) => string
  getLabel: (row: T) => string
  getLeftValue: (row: T) => number
  getRightValue: (row: T) => number
  leftLabel: string
  rightLabel: string
  leftColorClassName: string
  rightColorClassName: string
  getDetail?: (row: T) => string
  emptyMessage: string
}) {
  if (rows.length === 0) {
    return <EmptyState message={emptyMessage} />
  }

  const maxValue = Math.max(
    1,
    ...rows.flatMap((row) => [getLeftValue(row), getRightValue(row)]),
  )

  return (
    <article className={`${surfaceClassName} px-5 py-5`}>
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#616a41]">{title}</p>
      <p className="mt-3 text-sm leading-7 text-[#657670]">{description}</p>
      <div className="mt-5 grid gap-4">
        {rows.map((row) => {
          const leftValue = getLeftValue(row)
          const rightValue = getRightValue(row)
          return (
            <div key={getKey(row)} className="rounded-[1.2rem] border border-[#e8eee9] bg-white px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[#2f4540]">{getLabel(row)}</p>
                  {getDetail ? (
                    <p className="mt-1 text-xs leading-5 text-[#7b8a84]">{getDetail(row)}</p>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 grid gap-2">
                <BarRow
                  label={leftLabel}
                  value={leftValue}
                  maxValue={maxValue}
                  colorClassName={leftColorClassName}
                />
                <BarRow
                  label={rightLabel}
                  value={rightValue}
                  maxValue={maxValue}
                  colorClassName={rightColorClassName}
                />
              </div>
            </div>
          )
        })}
      </div>
    </article>
  )
}

function SingleMetricBarsPanel<T>({
  title,
  description,
  rows,
  getKey,
  getLabel,
  getValue,
  getDetail,
  emptyMessage,
  colorClassName,
  suffix,
}: {
  title: string
  description: string
  rows: T[]
  getKey: (row: T) => string
  getLabel: (row: T) => string
  getValue: (row: T) => number
  getDetail?: (row: T) => string
  emptyMessage: string
  colorClassName: string
  suffix: string
}) {
  if (rows.length === 0) {
    return <EmptyState message={emptyMessage} />
  }

  const maxValue = Math.max(1, ...rows.map((row) => getValue(row)))

  return (
    <article className={`${surfaceClassName} px-5 py-5`}>
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#616a41]">{title}</p>
      <p className="mt-3 text-sm leading-7 text-[#657670]">{description}</p>
      <div className="mt-5 grid gap-4">
        {rows.map((row) => (
          <div key={getKey(row)} className="rounded-[1.2rem] border border-[#e8eee9] bg-white px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-[#2f4540]">{getLabel(row)}</p>
                {getDetail ? (
                  <p className="mt-1 text-xs leading-5 text-[#7b8a84]">{getDetail(row)}</p>
                ) : null}
              </div>
              <p className="text-sm font-bold text-[#2f4540]">
                {formatNumber(getValue(row))} {suffix}
              </p>
            </div>
            <div className="mt-3 h-2 rounded-full bg-[#edf2ee]">
              <div
                className={`h-2 rounded-full ${colorClassName}`}
                style={{ width: `${Math.max(3, Math.min(100, (getValue(row) / maxValue) * 100))}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </article>
  )
}

function DetailCardsPanel({
  title,
  description,
  rows,
  emptyMessage,
}: {
  title: string
  description: string
  rows: Array<{ key: string; title: string; value: string; detail: string }>
  emptyMessage: string
}) {
  if (rows.length === 0) {
    return <EmptyState message={emptyMessage} />
  }

  return (
    <article className={`${surfaceClassName} px-5 py-5`}>
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#616a41]">{title}</p>
      <p className="mt-3 text-sm leading-7 text-[#657670]">{description}</p>
      <div className="mt-5 grid gap-3">
        {rows.map((row) => (
          <div
            key={row.key}
            className="rounded-[1.2rem] border border-[#e8eee9] bg-white px-4 py-4"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold text-[#2f4540]">{row.title}</p>
              {row.value ? (
                <span className="rounded-full border border-[rgba(144,151,122,0.28)] bg-[rgba(144,151,122,0.12)] px-3 py-1 text-xs font-semibold text-[#616a41]">
                  {row.value}
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm leading-6 text-[#6f807a]">{row.detail}</p>
          </div>
        ))}
      </div>
    </article>
  )
}

function ActionPanel({ rows }: { rows: InsightRecommendedActionRow[] }) {
  if (rows.length === 0) {
    return <EmptyState message="No recommended actions are available for this window." />
  }

  return (
    <article className={`${surfaceClassName} px-5 py-5`}>
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#616a41]">
        Recommended actions
      </p>
      <p className="mt-3 text-sm leading-7 text-[#657670]">
        These actions are generated from delivery gaps, warehouse pressure, OSA issues, competitor signals, and sales-rep observations in the selected window.
      </p>
      <div className="mt-5 grid gap-3">
        {rows.map((row) => (
          <div
            key={row.title}
            className="rounded-[1.2rem] border border-[#e8eee9] bg-white px-4 py-4"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold text-[#2f4540]">{row.title}</p>
              <span className={`rounded-full border px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] ${priorityClassName(row.priority)}`}>
                {row.priority}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-[#6f807a]">{row.reason}</p>
            <p className="mt-3 text-xs font-semibold text-[#616a41]">
              {row.owner} | {row.metric}
            </p>
          </div>
        ))}
      </div>
    </article>
  )
}

function TablePanel<T>({
  title,
  description,
  rows,
  columns,
  getKey,
  emptyMessage,
}: {
  title: string
  description: string
  rows: T[]
  columns: Array<{ key: string; label: string; render?: (row: T) => string }>
  getKey: (row: T) => string
  emptyMessage: string
}) {
  return (
    <article className={`${surfaceClassName} px-5 py-5`}>
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#616a41]">{title}</p>
      <p className="mt-3 text-sm leading-7 text-[#657670]">{description}</p>
      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[#e2ece8] text-xs uppercase tracking-[0.14em] text-[#789088]">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="py-3 pr-4">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#edf2ee] text-[#465c56]">
            {rows.map((row) => (
              <tr key={getKey(row)}>
                {columns.map((column) => (
                  <td key={column.key} className="py-3 pr-4">
                    {column.render ? column.render(row) : String((row as Record<string, unknown>)[column.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <EmptyState message={emptyMessage} /> : null}
      </div>
    </article>
  )
}

function BarRow({
  label,
  value,
  maxValue,
  colorClassName,
}: {
  label: string
  value: number
  maxValue: number
  colorClassName: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs font-semibold text-[#667a73]">
        <span>{label}</span>
        <span>{formatNumber(value)}</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-[rgba(144,151,122,0.18)]">
        <div
          className={`h-2 rounded-full ${colorClassName}`}
          style={{ width: `${Math.max(3, Math.min(100, (value / maxValue) * 100))}%` }}
        />
      </div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-[1.15rem] border border-[rgba(144,151,122,0.24)] bg-[rgba(144,151,122,0.08)] px-4 py-4 text-sm text-[#6f807a]">
      {message}
    </div>
  )
}
