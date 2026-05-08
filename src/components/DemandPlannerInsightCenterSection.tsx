import { useEffect, useState } from 'react'
import { getApiErrorMessage } from '../api/client'
import {
  downloadInsightCenterCsv,
  downloadInsightCenterPdf,
  fetchInsightCenterDashboard,
  type InsightCenterDashboard,
  type InsightFilterOption,
  type InsightCenterParams,
  type InsightDemandSplitRow,
  type InsightExceptionRow,
  type InsightKpi,
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

type SelectOption = InsightFilterOption

function toSelectOptions(values: string[]): SelectOption[] {
  return values.map((value) => ({
    value,
    label: formatOption(value),
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
  if (sourceType === 'exact') return 'border-[#c9dac1] bg-[#f4fbef] text-[#536f44]'
  if (sourceType === 'estimated') return 'border-[#e5d0a3] bg-[#fff8e7] text-[#80622b]'
  return 'border-[#c9d9de] bg-[#eef8fa] text-[#3d6e77]'
}

function severityClassName(severity: InsightExceptionRow['severity']) {
  if (severity === 'HIGH') return 'border-[#e5b8a8] bg-[#fff2ee] text-[#96513d]'
  if (severity === 'MEDIUM') return 'border-[#e6d2a5] bg-[#fff8e8] text-[#80612c]'
  return 'border-[#d5e4c7] bg-[#f5fbef] text-[#5b7145]'
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

export default function DemandPlannerInsightCenterSection() {
  const [period, setPeriod] = useState('30d')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
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

  const readParams = (): InsightCenterParams | null => {
    const trimmedFromDate = fromDate.trim()
    const trimmedToDate = toDate.trim()

    if (trimmedFromDate && trimmedToDate && trimmedFromDate > trimmedToDate) {
      setError('From date cannot be after the to date.')
      setFeedback(null)
      return null
    }

    return {
      period,
      fromDate: trimmedFromDate || undefined,
      toDate: trimmedToDate || undefined,
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
    const params = readParams()
    if (!params) return

    setIsLoading(true)
    setError(null)
    setFeedback(null)

    try {
      const data = await fetchInsightCenterDashboard(params)
      setDashboard(data)
      setFeedback('Insight Center refreshed with the latest demand signals.')
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
    const params = readParams()
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
    const params = readParams()
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

  const trendRows = dashboard?.charts.trend ?? []
  const maxTrendValue = Math.max(
    1,
    ...trendRows.map((row) =>
      Math.max(
        row.display_ordered_cases,
        row.display_delivered_cases,
        row.display_estimated_retail_offtake_cases,
        row.display_forecast_cases,
      ),
    ),
  )
  const periodOptions = toSelectOptions(dashboard?.controls.periods ?? ['7d', '30d', '90d', 'ytd', 'custom'])
  const granularityOptions = toSelectOptions(dashboard?.controls.granularities ?? ['daily', 'weekly', 'monthly'])
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

  return (
    <div className="grid gap-6">
      <section className={`${surfaceClassName} overflow-hidden`}>
        <div className="border-b border-[#efe1d5] bg-[radial-gradient(circle_at_top_left,_rgba(72,121,121,0.16),_transparent_34%),linear-gradient(135deg,#fff8ec_0%,#eef8f5_52%,#ffffff_100%)] px-6 py-6 sm:px-7">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#5e8b84]">
            Demand Planner Insight Center
          </p>
          <h2 className="mt-3 text-[1.9rem] font-bold tracking-[-0.04em] text-[#2d423f]">
            Visual demand intelligence with confidence kept visible
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[#657670]">
            Explore exact shop ordering demand beside estimated consumer demand, then download planner-ready
            PDF and CSV reports with actions, exceptions, and evidence-backed summaries.
          </p>
        </div>

        <div className="grid gap-4 px-6 py-6 sm:px-7 md:grid-cols-2 xl:grid-cols-4">
          <FilterSelect label="Time period" value={period} onChange={setPeriod} options={periodOptions} />
          <FilterSelect label="Granularity" value={granularity} onChange={setGranularity} options={granularityOptions} />
          <FilterSelect label="Demand type" value={demandType} onChange={setDemandType} options={demandTypeOptions} />
          <FilterSelect label="View mode" value={viewMode} onChange={setViewMode} options={viewModeOptions} />
          <FilterSelect label="Confidence" value={confidenceLevel} onChange={setConfidenceLevel} options={confidenceLevelOptions} />
          <FilterSelect label="Compare mode" value={compareMode} onChange={setCompareMode} options={compareModeOptions} />
          <FilterSelect label="Territory" value={territoryId} onChange={setTerritoryId} options={territoryOptions} />
          <FilterSelect label="Warehouse" value={warehouseId} onChange={setWarehouseId} options={warehouseOptions} />
          <label className="space-y-2">
            <span className="text-sm font-semibold text-[#3f5652]">From date</span>
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="w-full rounded-[1rem] border border-[#d6dfd8] bg-[#fffdfb] px-4 py-3 text-sm text-[#2f4540] outline-none transition duration-300 focus:border-[#6e9d94]"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-[#3f5652]">To date</span>
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="w-full rounded-[1rem] border border-[#d6dfd8] bg-[#fffdfb] px-4 py-3 text-sm text-[#2f4540] outline-none transition duration-300 focus:border-[#6e9d94]"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-3 border-t border-[#efe1d5] px-6 py-5 sm:px-7">
          <button
            type="button"
            onClick={() => void loadDashboard()}
            disabled={isLoading}
            className="rounded-[1rem] bg-[#3f756f] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(63,117,111,0.18)] transition duration-300 hover:bg-[#315f5a] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? 'Refreshing insights...' : 'Refresh insights'}
          </button>
          <button
            type="button"
            onClick={() => void downloadPdf()}
            disabled={isDownloadingPdf}
            className="rounded-[1rem] border border-[#b8cbc7] bg-white px-5 py-3 text-sm font-semibold text-[#3f756f] transition duration-300 hover:border-[#79a79f] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isDownloadingPdf ? 'Preparing PDF...' : 'Download PDF'}
          </button>
          <button
            type="button"
            onClick={() => void downloadCsv()}
            disabled={isDownloadingCsv}
            className="rounded-[1rem] border border-[#b8cbc7] bg-white px-5 py-3 text-sm font-semibold text-[#3f756f] transition duration-300 hover:border-[#79a79f] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isDownloadingCsv ? 'Preparing CSV...' : 'Download CSV'}
          </button>
        </div>

        {dashboard ? (
          <div className="border-t border-[#efe1d5] bg-[#fffaf4] px-6 py-4 text-sm leading-7 text-[#765d47] sm:px-7">
            <span className="font-semibold text-[#5b3e2b]">Data integrity note:</span>{' '}
            {dashboard.summary.dataIntegrityWarning}
          </div>
        ) : null}
      </section>

      {feedback ? (
        <div className="rounded-[1rem] border border-[#cfe2c8] bg-[#f3fbef] px-4 py-3 text-sm text-[#4d6c45]">
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
                  ? 'bg-[#3f756f] text-white shadow-[0_12px_28px_rgba(63,117,111,0.16)]'
                  : 'bg-[#f7eee7] text-[#6f5a48] hover:bg-[#efe2d8]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="px-6 py-6 sm:px-7">
          {activeTab === 'Overview' ? (
            <OverviewTab dashboard={dashboard} maxTrendValue={maxTrendValue} />
          ) : null}
          {activeTab === 'Demand Trends' ? (
            <DemandTrendsTab rows={trendRows} maxTrendValue={maxTrendValue} />
          ) : null}
          {activeTab === 'Forecast' ? <ForecastTab dashboard={dashboard} /> : null}
          {activeTab === 'Promotions' ? <PromotionsTab dashboard={dashboard} /> : null}
          {activeTab === 'Competitors & Feedback' ? <CompetitorsTab dashboard={dashboard} /> : null}
          {activeTab === 'Operations & Risks' ? <OperationsTab dashboard={dashboard} /> : null}
          {activeTab === 'Shop / SKU Drilldown' ? <DrilldownTab dashboard={dashboard} /> : null}
          {activeTab === 'Report' ? (
            <ReportTab
              dashboard={dashboard}
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
      <span className="text-sm font-semibold text-[#3f5652]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[1rem] border border-[#d6dfd8] bg-[#fffdfb] px-4 py-3 text-sm text-[#2f4540] outline-none transition duration-300 focus:border-[#6e9d94]"
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
        <span className={`rounded-full border px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] ${sourceBadgeClassName(kpi.sourceType)}`}>
          {kpi.sourceType}
        </span>
      </div>
      <p className="mt-3 text-[1.65rem] font-bold tracking-[-0.04em] text-[#2f4540]">
        {formatKpiValue(kpi)}
      </p>
      <p className="mt-2 text-xs leading-5 text-[#7b8a84]">{kpi.caption}</p>
      {kpi.confidenceScore !== null ? (
        <p className="mt-3 text-xs font-semibold text-[#5e8b84]">
          Confidence {formatPercent(kpi.confidenceScore)}
        </p>
      ) : null}
    </article>
  )
}

function OverviewTab({
  dashboard,
  maxTrendValue,
}: {
  dashboard: InsightCenterDashboard | null
  maxTrendValue: number
}) {
  const trendRows = dashboard?.charts.trend.slice(-8) ?? []
  const heatmapRows = dashboard?.charts.territoryHeatmap.slice(0, 5) ?? []

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
      <article>
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#5e8b84]">
          AI Summary
        </p>
        <div className="mt-4 grid gap-3">
          {(dashboard?.summary.aiSummary ?? []).map((summary) => (
            <div key={summary} className="rounded-[1.25rem] border border-[#dce8e4] bg-[#f6fbf8] px-4 py-4 text-sm leading-7 text-[#526963]">
              {summary}
            </div>
          ))}
          {!dashboard ? <EmptyState message="Loading insight summary..." /> : null}
        </div>

        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.22em] text-[#5e8b84]">
          Recent Demand Pulse
        </p>
        <div className="mt-4 grid gap-3">
          {trendRows.map((row) => (
            <TrendBars key={row.date} row={row} maxValue={maxTrendValue} compact />
          ))}
        </div>
      </article>

      <article>
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#5e8b84]">
          Hotspots
        </p>
        <div className="mt-4 grid gap-3">
          {heatmapRows.map((row) => (
            <div key={`${row.territory_id ?? 'none'}-${row.product_id}`} className="rounded-[1.25rem] border border-[#eee2d7] bg-[#fff9f3] px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[#3c4f49]">{row.territory_name}</p>
                  <p className="mt-1 text-sm text-[#7f6657]">{row.product_name}</p>
                </div>
                <span className="rounded-full bg-[#f1c36f] px-3 py-1 text-xs font-bold text-[#65410f]">
                  {formatNumber(row.intensity_score)}
                </span>
              </div>
              <div className="mt-3 grid gap-2 text-sm text-[#6f807a] sm:grid-cols-2">
                <p>Gap: <span className="font-semibold">{formatNumber(row.demand_gap_cases)} cases</span></p>
                <p>Stockouts: <span className="font-semibold">{row.stockout_count}</span></p>
                <p>Estimated offtake: <span className="font-semibold">{formatNumber(row.estimated_retail_offtake_cases)}</span></p>
                <p>Confidence: <span className="font-semibold">{formatPercent(row.confidence_score)}</span></p>
              </div>
            </div>
          ))}
          {heatmapRows.length === 0 ? <EmptyState message="No hotspot rows are available for this window." /> : null}
        </div>
      </article>
    </div>
  )
}

function DemandTrendsTab({
  rows,
  maxTrendValue,
}: {
  rows: InsightTrendPoint[]
  maxTrendValue: number
}) {
  return (
    <div className="grid gap-4">
      <div className="rounded-[1.25rem] border border-[#dce8e4] bg-[#f6fbf8] px-4 py-4 text-sm leading-7 text-[#526963]">
        Switch the view mode above to compare absolute volume, normalized volume, or confidence-adjusted volume without blending exact demand and estimated retail offtake.
      </div>
      {rows.map((row) => (
        <TrendBars key={row.date} row={row} maxValue={maxTrendValue} />
      ))}
      {rows.length === 0 ? <EmptyState message="No trend rows are available yet." /> : null}
    </div>
  )
}

function TrendBars({
  row,
  maxValue,
  compact = false,
}: {
  row: InsightTrendPoint
  maxValue: number
  compact?: boolean
}) {
  return (
    <div className="rounded-[1.2rem] border border-[#e8eee9] bg-white px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-semibold text-[#2f4540]">{row.label}</p>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#789088]">
          Confidence {formatPercent(row.confidence_score)}
        </p>
      </div>
      <div className={`mt-3 grid gap-2 ${compact ? '' : 'sm:grid-cols-2'}`}>
        <Bar label="Ordered" value={row.display_ordered_cases} maxValue={maxValue} color="bg-[#3f756f]" />
        <Bar label="Delivered" value={row.display_delivered_cases} maxValue={maxValue} color="bg-[#88a764]" />
        <Bar label="Estimated Retail Offtake" value={row.display_estimated_retail_offtake_cases} maxValue={maxValue} color="bg-[#d49a45]" />
        <Bar label="Forecast" value={row.display_forecast_cases} maxValue={maxValue} color="bg-[#5978a7]" />
      </div>
    </div>
  )
}

function Bar({
  label,
  value,
  maxValue,
  color,
}: {
  label: string
  value: number
  maxValue: number
  color: string
}) {
  const width = `${Math.max(3, Math.min(100, (value / maxValue) * 100))}%`

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs font-semibold text-[#667a73]">
        <span>{label}</span>
        <span>{formatNumber(value)}</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-[#edf2ee]">
        <div className={`h-2 rounded-full ${color}`} style={{ width }} />
      </div>
    </div>
  )
}

function ForecastTab({ dashboard }: { dashboard: InsightCenterDashboard | null }) {
  const accuracyRows = dashboard?.charts.actualVsForecast.slice(0, 8) ?? []
  const waterfallRows = dashboard?.charts.waterfall ?? []
  const exceptionRows = dashboard?.charts.exceptions.slice(0, 6) ?? []

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <article>
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#5e8b84]">
          Actual vs Forecast
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[#e2ece8] text-xs uppercase tracking-[0.14em] text-[#789088]">
              <tr>
                <th className="py-3 pr-4">Product</th>
                <th className="py-3 pr-4">Type</th>
                <th className="py-3 pr-4">Actual</th>
                <th className="py-3 pr-4">Forecast</th>
                <th className="py-3 pr-4">WAPE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf2ee] text-[#465c56]">
              {accuracyRows.map((row) => (
                <tr key={`${row.demand_type}-${row.product_id}-${row.territory_id ?? 'none'}`}>
                  <td className="py-3 pr-4 font-semibold">{row.product_name}</td>
                  <td className="py-3 pr-4">{demandTypeLabel(row.demand_type)}</td>
                  <td className="py-3 pr-4">{formatNumber(row.actual_cases)}</td>
                  <td className="py-3 pr-4">{formatNumber(row.forecast_cases)}</td>
                  <td className="py-3 pr-4">{formatPercent(row.wape)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {accuracyRows.length === 0 ? <EmptyState message="Backtesting needs more historical demand points." /> : null}
        </div>
      </article>

      <article>
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#5e8b84]">
          Forecast Movement Drivers
        </p>
        <div className="mt-4 grid gap-3">
          {waterfallRows.map((row) => (
            <div key={row.driver} className="flex items-center justify-between gap-4 rounded-[1.1rem] border border-[#e8eee9] bg-[#fbfdfb] px-4 py-3 text-sm">
              <span className="font-semibold text-[#405850]">{row.driver}</span>
              <span className={row.direction === 'down' ? 'font-bold text-[#9b5944]' : 'font-bold text-[#47705e]'}>
                {formatNumber(row.cases)} cases
              </span>
            </div>
          ))}
        </div>
      </article>

      <article className="xl:col-span-2">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#5e8b84]">
          Exceptions
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {exceptionRows.map((row) => (
            <div key={`${row.exception_type}-${row.reason}`} className={`rounded-[1.1rem] border px-4 py-4 text-sm ${severityClassName(row.severity)}`}>
              <p className="font-semibold">{row.exception_type}</p>
              <p className="mt-2 leading-6">{row.reason}</p>
              <p className="mt-2 font-semibold">Action: {row.recommended_action}</p>
            </div>
          ))}
          {exceptionRows.length === 0 ? <EmptyState message="No forecast exceptions surfaced for this window." /> : null}
        </div>
      </article>
    </div>
  )
}

function PromotionsTab({ dashboard }: { dashboard: InsightCenterDashboard | null }) {
  const splitRows = dashboard?.charts.demandSplit ?? []
  const promotionRows = dashboard?.charts.promotionImpact ?? []
  const maxSplit = Math.max(1, ...splitRows.map((row) => row.cases))

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <article>
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#5e8b84]">
          Demand Composition
        </p>
        <div className="mt-4 grid gap-3">
          {splitRows.map((row) => (
            <DemandSplitBar key={row.segment} row={row} maxValue={maxSplit} />
          ))}
        </div>
      </article>

      <article>
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#5e8b84]">
          Promotion Impact
        </p>
        <div className="mt-4 grid gap-3">
          {promotionRows.map((row) => (
            <div key={row.phase} className="rounded-[1.15rem] border border-[#eee2d7] bg-[#fffaf5] px-4 py-4">
              <p className="font-semibold text-[#3c4f49]">{row.phase}</p>
              <div className="mt-3 grid gap-2 text-sm text-[#6f807a] sm:grid-cols-2">
                <p>Ordered: <span className="font-semibold">{formatNumber(row.ordered_cases)} cases</span></p>
                <p>Estimated offtake: <span className="font-semibold">{formatNumber(row.estimated_retail_offtake_cases)} cases</span></p>
              </div>
            </div>
          ))}
          {promotionRows.length === 0 ? <EmptyState message="No promotion impact rows are available yet." /> : null}
        </div>
      </article>
    </div>
  )
}

function DemandSplitBar({
  row,
  maxValue,
}: {
  row: InsightDemandSplitRow
  maxValue: number
}) {
  return (
    <div className="rounded-[1.15rem] border border-[#e8eee9] bg-white px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-[#405850]">{row.segment}</p>
          <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] ${sourceBadgeClassName(row.source_type)}`}>
            {row.source_type}
          </span>
        </div>
        <p className="font-bold text-[#2f4540]">{formatNumber(row.cases)}</p>
      </div>
      <div className="mt-3 h-2 rounded-full bg-[#edf2ee]">
        <div className="h-2 rounded-full bg-[#d49a45]" style={{ width: `${Math.max(3, Math.min(100, (row.cases / maxValue) * 100))}%` }} />
      </div>
    </div>
  )
}

function CompetitorsTab({ dashboard }: { dashboard: InsightCenterDashboard | null }) {
  const competitorRows = dashboard?.charts.competitorPressure ?? []
  const themeRows = dashboard?.charts.feedbackThemes ?? []

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <article>
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#5e8b84]">
          Competitor Pressure
        </p>
        <div className="mt-4 grid gap-3">
          {competitorRows.map((row) => (
            <div key={row.label} className="rounded-[1.15rem] border border-[#e8eee9] bg-[#fbfdfb] px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-[#405850]">{row.label}</p>
                <p className="font-bold text-[#9b5944]">{row.mentions} mentions</p>
              </div>
              <p className="mt-2 text-sm text-[#6f807a]">High severity: {row.high_severity}</p>
            </div>
          ))}
          {competitorRows.length === 0 ? <EmptyState message="No competitor pressure signals in this window." /> : null}
        </div>
      </article>

      <article>
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#5e8b84]">
          Feedback Themes
        </p>
        <div className="mt-4 grid gap-3">
          {themeRows.map((row) => (
            <div key={row.theme} className="flex items-center justify-between rounded-[1.15rem] border border-[#eee2d7] bg-[#fffaf5] px-4 py-4">
              <p className="font-semibold text-[#405850]">{row.theme}</p>
              <p className="font-bold text-[#2f4540]">{row.count}</p>
            </div>
          ))}
          {themeRows.length === 0 ? <EmptyState message="No feedback themes have been detected yet." /> : null}
        </div>
      </article>
    </div>
  )
}

function OperationsTab({ dashboard }: { dashboard: InsightCenterDashboard | null }) {
  const stockoutRows = dashboard?.charts.stockoutImpact ?? []
  const coverageRows = dashboard?.charts.visitCoverageConfidence ?? []

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <article>
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#5e8b84]">
          Stockout Impact
        </p>
        <div className="mt-4 grid gap-3">
          {stockoutRows.map((row) => (
            <div key={`${row.territory_name}-${row.product_id}`} className="rounded-[1.15rem] border border-[#f0d7c9] bg-[#fff7f2] px-4 py-4">
              <p className="font-semibold text-[#405850]">{row.product_name}</p>
              <p className="mt-1 text-sm text-[#7f6657]">{row.territory_name}</p>
              <div className="mt-3 grid gap-2 text-sm text-[#765d47] sm:grid-cols-2">
                <p>Stockouts: <span className="font-semibold">{row.stockout_count}</span></p>
                <p>Estimated lost demand: <span className="font-semibold">{formatNumber(row.estimated_lost_demand_cases)} cases</span></p>
              </div>
            </div>
          ))}
          {stockoutRows.length === 0 ? <EmptyState message="No stockout impact rows are available." /> : null}
        </div>
      </article>

      <article>
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#5e8b84]">
          Visit Coverage / Confidence
        </p>
        <div className="mt-4 grid gap-3">
          {coverageRows.map((row) => (
            <div key={row.territory_id ?? row.territory_name} className="rounded-[1.15rem] border border-[#e8eee9] bg-[#fbfdfb] px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-[#405850]">{row.territory_name}</p>
                <p className="font-bold text-[#3f756f]">{formatPercent(row.confidence_score)}</p>
              </div>
              <div className="mt-3 grid gap-2 text-sm text-[#6f807a] sm:grid-cols-3">
                <p>Outlets: <span className="font-semibold">{row.active_outlets}</span></p>
                <p>Visits: <span className="font-semibold">{row.visit_count}</span></p>
                <p>Last visit: <span className="font-semibold">{row.days_since_last_visit ?? 'N/A'} days</span></p>
              </div>
            </div>
          ))}
          {coverageRows.length === 0 ? <EmptyState message="No visit coverage rows are available." /> : null}
        </div>
      </article>
    </div>
  )
}

function DrilldownTab({ dashboard }: { dashboard: InsightCenterDashboard | null }) {
  const rows = dashboard?.drilldowns ?? []

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-[#e2ece8] text-xs uppercase tracking-[0.14em] text-[#789088]">
          <tr>
            <th className="py-3 pr-4">Shop</th>
            <th className="py-3 pr-4">SKU</th>
            <th className="py-3 pr-4">Ordered</th>
            <th className="py-3 pr-4">Delivered</th>
            <th className="py-3 pr-4">Estimated Retail Offtake</th>
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
  )
}

function ReportTab({
  dashboard,
  onDownloadCsv,
  onDownloadPdf,
  isDownloadingCsv,
  isDownloadingPdf,
}: {
  dashboard: InsightCenterDashboard | null
  onDownloadCsv: () => void
  onDownloadPdf: () => void
  isDownloadingCsv: boolean
  isDownloadingPdf: boolean
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <article className="rounded-[1.35rem] border border-[#dce8e4] bg-[#f6fbf8] px-5 py-5">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#5e8b84]">
          Planner-ready downloads
        </p>
        <p className="mt-3 text-sm leading-7 text-[#526963]">
          Export a PDF for planning meetings or a CSV for deeper downstream analysis. Both preserve the exact versus estimated signal labels.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onDownloadPdf}
            disabled={isDownloadingPdf}
            className="rounded-[1rem] bg-[#3f756f] px-5 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-[#315f5a] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isDownloadingPdf ? 'Preparing PDF...' : 'Download PDF'}
          </button>
          <button
            type="button"
            onClick={onDownloadCsv}
            disabled={isDownloadingCsv}
            className="rounded-[1rem] border border-[#b8cbc7] bg-white px-5 py-3 text-sm font-semibold text-[#3f756f] transition duration-300 hover:border-[#79a79f] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isDownloadingCsv ? 'Preparing CSV...' : 'Download CSV'}
          </button>
        </div>
      </article>

      <article>
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#5e8b84]">
          Report Evidence
        </p>
        <div className="mt-4 grid gap-3">
          {(dashboard?.summary.aiSummary ?? []).map((summary) => (
            <div key={summary} className="rounded-[1.15rem] border border-[#eee2d7] bg-[#fffaf5] px-4 py-4 text-sm leading-7 text-[#6f5a48]">
              {summary}
            </div>
          ))}
        </div>
      </article>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-[1.15rem] border border-[#e8eee9] bg-[#fbfdfb] px-4 py-4 text-sm text-[#6f807a]">
      {message}
    </div>
  )
}
