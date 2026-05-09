import { useEffect, useMemo, useState } from 'react'
import {
  downloadForecastEngineReport,
  downloadImportedForecastEngineReport,
  fetchForecastEnginePreview,
  fetchImportedForecastEnginePreview,
  type ForecastControlOption,
  type ForecastEngineParams,
  type ForecastEnginePreview,
  type ForecastExceptionRow,
  type ForecastOutputRow,
  type ManufacturePlanPoint,
  type PlannerRecommendation,
} from '../api/forecastEngine'
import { getApiErrorMessage } from '../api/client'

const surfaceClassName =
  'rounded-[1.8rem] border border-[#ebdfd5] bg-white shadow-[0_20px_48px_rgba(59,31,15,0.08)]'

const defaultPlanningWindows: ForecastControlOption[] = [
  { value: 'next_week', label: 'Next week', days: 7 },
  { value: 'next_2_weeks', label: 'Next 2 weeks', days: 14 },
  { value: 'next_month', label: 'Next month', days: 30 },
  { value: 'next_quarter', label: 'Next quarter', days: 90 },
  { value: 'next_6_months', label: 'Next 6 months', days: 180 },
  { value: 'next_year', label: 'Next year', days: 365 },
]

function defaultDateInput(offsetDays = 0) {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  return date.toISOString().slice(0, 10)
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'N/A'
  }

  return `${Math.round(value * 100)}%`
}

function formatNumber(value: number | null | undefined, maximumFractionDigits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '0'
  }

  return value.toLocaleString(undefined, {
    maximumFractionDigits,
  })
}

function formatDemandType(value: ForecastOutputRow['demand_type']) {
  return value === 'REPLENISHMENT_DEMAND'
    ? 'Replenishment'
    : 'Retail offtake'
}

function severityClassName(severity: ForecastExceptionRow['severity']) {
  if (severity === 'HIGH') {
    return 'border-[#e5b8a8] bg-[#fff2ee] text-[#96513d]'
  }

  if (severity === 'MEDIUM') {
    return 'border-[#e6d2a5] bg-[#fff8e8] text-[#80612c]'
  }

  return 'border-[#d5e4c7] bg-[#f5fbef] text-[#5b7145]'
}

function actionClassName(action: PlannerRecommendation['action']) {
  if (action === 'INCREASE') {
    return 'border-[#cde0c9] bg-[#f4fbf1] text-[#476443]'
  }

  if (action === 'DECREASE') {
    return 'border-[#ead4c0] bg-[#fff7ef] text-[#8b5b33]'
  }

  return 'border-[#d8dde8] bg-[#f6f8fc] text-[#58647f]'
}

function urgencyClassName(urgency: PlannerRecommendation['urgency']) {
  if (urgency === 'HIGH') {
    return 'border-[#e7b8b1] bg-[#fff3f1] text-[#9b4c44]'
  }

  if (urgency === 'MEDIUM') {
    return 'border-[#ead9ae] bg-[#fff9eb] text-[#8a6630]'
  }

  return 'border-[#cfe0c8] bg-[#f4fbef] text-[#547249]'
}

function confidenceMeaning(score: number | null | undefined) {
  if (score === null || score === undefined || !Number.isFinite(score)) {
    return 'No confidence score is available yet.'
  }

  if (score >= 0.8) {
    return 'The quantity is strong enough to use as a planning number with normal review.'
  }

  if (score >= 0.6) {
    return 'The direction is useful, but the exact quantity still needs planner judgment.'
  }

  return 'Treat this as a warning signal, not an automatic manufacturing quantity.'
}

function wapeMeaning(wape: number | null | undefined) {
  if (wape === null || wape === undefined || !Number.isFinite(wape)) {
    return 'No packaged backtest is available for this run.'
  }

  if (wape <= 0.2) {
    return 'Recent forecasts were fairly close to actual demand.'
  }

  if (wape <= 0.5) {
    return 'Recent forecasts were usable, but still need planner checks.'
  }

  return 'Recent forecasts missed actual demand materially, so quantities need closer review.'
}

function resolvePlanningDays(
  planningWindow: string,
  options: ForecastControlOption[],
) {
  return (
    options.find((option) => option.value === planningWindow)?.days ??
    defaultPlanningWindows.find((option) => option.value === planningWindow)?.days ??
    30
  )
}

function linePath(
  plan: ManufacturePlanPoint[],
  width: number,
  height: number,
  maxValue: number,
  extractor: (point: ManufacturePlanPoint) => number,
) {
  return plan
    .map((point, index) => {
      const x =
        plan.length === 1 ? width / 2 : (index / Math.max(1, plan.length - 1)) * width
      const y = height - (extractor(point) / maxValue) * height
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
}

function buildManufactureSummary(
  recommendations: PlannerRecommendation[],
  selectedProductLabel: string,
) {
  if (recommendations.length === 0) {
    return []
  }

  return recommendations.map((recommendation) => ({
    id: recommendation.recommendation_id,
    productLabel:
      selectedProductLabel !== 'All products'
        ? selectedProductLabel
        : recommendation.product_name,
    totalCases: recommendation.recommended_production_cases,
    dailyCases: recommendation.suggested_daily_manufacture_cases,
    currentStockCases: recommendation.current_stock_cases,
    requiredCases: recommendation.required_cases,
    forecastCases: recommendation.forecast_cases,
    horizonStart: recommendation.horizon_start,
    horizonEnd: recommendation.horizon_end,
  }))
}

function buildScopeStatus(recommendations: PlannerRecommendation[]) {
  if (recommendations.length === 0) {
    return null
  }

  const totals = recommendations.reduce(
    (accumulator, recommendation) => ({
      totalForecastCases:
        accumulator.totalForecastCases + recommendation.forecast_cases,
      totalRequiredCases:
        accumulator.totalRequiredCases + recommendation.required_cases,
      totalCurrentStockCases:
        accumulator.totalCurrentStockCases + recommendation.current_stock_cases,
      totalRecommendedCases:
        accumulator.totalRecommendedCases +
        recommendation.recommended_production_cases,
    }),
    {
      totalForecastCases: 0,
      totalRequiredCases: 0,
      totalCurrentStockCases: 0,
      totalRecommendedCases: 0,
    },
  )

  return {
    ...totals,
    allZeroBuild: recommendations.every(
      (recommendation) => recommendation.recommended_production_cases <= 0,
    ),
  }
}

function formatChartDateLabel(date: string, cadence: 'daily' | 'weekly' | 'monthly') {
  if (cadence === 'monthly') {
    return date.slice(0, 7)
  }

  if (cadence === 'weekly') {
    return `Wk ${date.slice(5)}`
  }

  return date.slice(5)
}

function aggregatePlanForChart(plan: ManufacturePlanPoint[]) {
  if (plan.length <= 45) {
    return {
      cadence: 'daily' as const,
      points: plan,
    }
  }

  if (plan.length <= 120) {
    const weeklyBuckets = new Map<string, ManufacturePlanPoint>()

    plan.forEach((point, index) => {
      const bucketIndex = Math.floor(index / 7)
      const bucketKey = `${point.date}|week-${bucketIndex}`
      const existing = weeklyBuckets.get(bucketKey) ?? {
        date: point.date,
        total_forecast_cases: 0,
        replenishment_forecast_cases: 0,
        retail_offtake_forecast_cases: 0,
        recommended_manufacture_cases: 0,
      }

      existing.total_forecast_cases += point.total_forecast_cases
      existing.replenishment_forecast_cases += point.replenishment_forecast_cases
      existing.retail_offtake_forecast_cases += point.retail_offtake_forecast_cases
      existing.recommended_manufacture_cases += point.recommended_manufacture_cases
      weeklyBuckets.set(bucketKey, existing)
    })

    return {
      cadence: 'weekly' as const,
      points: [...weeklyBuckets.values()],
    }
  }

  const monthlyBuckets = new Map<string, ManufacturePlanPoint>()
  plan.forEach((point) => {
    const monthKey = point.date.slice(0, 7)
    const existing = monthlyBuckets.get(monthKey) ?? {
      date: `${monthKey}-01`,
      total_forecast_cases: 0,
      replenishment_forecast_cases: 0,
      retail_offtake_forecast_cases: 0,
      recommended_manufacture_cases: 0,
    }

    existing.total_forecast_cases += point.total_forecast_cases
    existing.replenishment_forecast_cases += point.replenishment_forecast_cases
    existing.retail_offtake_forecast_cases += point.retail_offtake_forecast_cases
    existing.recommended_manufacture_cases += point.recommended_manufacture_cases
    monthlyBuckets.set(monthKey, existing)
  })

  return {
    cadence: 'monthly' as const,
    points: [...monthlyBuckets.values()],
  }
}

export default function DemandForecastEngineSection() {
  const [sourceMode, setSourceMode] = useState<'live' | 'imported_bundle'>('live')
  const [bundleFile, setBundleFile] = useState<File | null>(null)
  const [fromDate, setFromDate] = useState(() => defaultDateInput(-90))
  const [toDate, setToDate] = useState(() => defaultDateInput(0))
  const [planningWindow, setPlanningWindow] = useState('next_month')
  const [productId, setProductId] = useState('')
  const [backtestDays, setBacktestDays] = useState('14')
  const [preview, setPreview] = useState<ForecastEnginePreview | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const planningOptions = preview?.controls?.planningWindows ?? defaultPlanningWindows
  const productOptions = preview?.controls?.products ?? [{ value: '', label: 'All products' }]
  const forecastDays = resolvePlanningDays(planningWindow, planningOptions)

  const readParams = (): ForecastEngineParams | null => {
    const parsedBacktestDays = Number(backtestDays)
    const trimmedFromDate = fromDate.trim()
    const trimmedToDate = toDate.trim()

    if (!trimmedFromDate || !trimmedToDate) {
      setError('Select both From date and To date before running or downloading the planner report.')
      return null
    }

    if (
      !Number.isInteger(parsedBacktestDays) ||
      parsedBacktestDays < 1 ||
      parsedBacktestDays > 90
    ) {
      setError('Backtest window must be a whole number between 1 and 90 days.')
      return null
    }

    if (trimmedFromDate && trimmedToDate && trimmedFromDate > trimmedToDate) {
      setError('From date cannot be after the to date.')
      return null
    }

    return {
      fromDate: trimmedFromDate || undefined,
      toDate: trimmedToDate || undefined,
      forecastDays,
      backtestDays: parsedBacktestDays,
      planningWindow,
      productId: productId || undefined,
    }
  }

  const loadPreview = async () => {
    const params = readParams()
    if (!params) return

    if (sourceMode === 'imported_bundle' && !bundleFile) {
      setError('Upload an export ZIP bundle before running imported forecast mode.')
      return
    }

    setIsLoading(true)
    setError(null)
    setFeedback(null)
    setPreview(null)

    try {
      const data =
        sourceMode === 'imported_bundle' && bundleFile
          ? await fetchImportedForecastEnginePreview(bundleFile, params)
          : await fetchForecastEnginePreview(params)

      setPreview(data)
      setPlanningWindow(data.summary.planningWindow ?? params.planningWindow ?? 'next_month')
      setProductId(data.summary.selectedProductId ?? params.productId ?? '')
      setFeedback(
        sourceMode === 'imported_bundle'
          ? `${bundleFile?.name ?? 'Bundle'} loaded into the planner.`
          : 'Forecast engine preview refreshed.',
      )
    } catch (requestError) {
      const message = getApiErrorMessage(
        requestError,
        'Unable to run the ARS demand forecast engine right now.',
      )
      setError(
        sourceMode === 'imported_bundle' && message === 'Network Error'
          ? 'The browser could not submit the ZIP bundle just now. Hard refresh this page first. If it still fails, you are likely on an older cached frontend or a blocked network path rather than a missing import route.'
          : message,
      )
    } finally {
      setIsLoading(false)
    }
  }

  const downloadReport = async () => {
    const params = readParams()
    if (!params) return

    if (sourceMode === 'imported_bundle' && !bundleFile) {
      setError('Upload an export ZIP bundle before generating the planner PDF.')
      return
    }

    setIsDownloading(true)
    setError(null)
    setFeedback(null)

    try {
      const { blob, filename } =
        sourceMode === 'imported_bundle' && bundleFile
          ? await downloadImportedForecastEngineReport(bundleFile, params)
          : await downloadForecastEngineReport(params)

      const downloadUrl = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = downloadUrl
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 1000)
      setFeedback(`${filename} is ready.`)
    } catch (requestError) {
      const message = getApiErrorMessage(
        requestError,
        'Unable to download the planner PDF right now.',
      )
      setError(
        sourceMode === 'imported_bundle' && message === 'Network Error'
          ? 'The browser could not reach the imported-bundle PDF request just now. Hard refresh this page first. If it still fails, you are likely on an older cached frontend or a blocked network path.'
          : message,
      )
    } finally {
      setIsDownloading(false)
    }
  }

  useEffect(() => {
    void loadPreview()
    // We only want the initial live preview here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const summary = preview?.summary
  const plannerBrief = preview?.plannerBrief
  const topForecasts = preview?.forecastOutput?.slice(0, 10) ?? []
  const exceptionRows = preview?.exceptions?.slice(0, 6) ?? []
  const accuracyRows = preview?.accuracyReport?.slice(0, 6) ?? []
  const aiRows = preview?.aiExplanations?.slice(0, 5) ?? []
  const recommendations = preview?.productionRecommendations?.slice(0, 8) ?? []
  const manufacturePlan = preview?.manufacturePlan ?? []

  const selectedProductLabel = useMemo(() => {
    const selected = productOptions.find((option) => option.value === productId)
    return selected?.label ?? 'All products'
  }, [productId, productOptions])

  const manufactureSummary = useMemo(
    () => buildManufactureSummary(recommendations, selectedProductLabel),
    [recommendations, selectedProductLabel],
  )
  const scopeStatus = useMemo(
    () => buildScopeStatus(recommendations),
    [recommendations],
  )

  return (
    <div className="grid gap-6">
      <section className={`${surfaceClassName} overflow-hidden`}>
        <div className="border-b border-[#efe1d5] bg-[linear-gradient(135deg,#eef6f2_0%,#fffaf4_52%,#ffffff_100%)] px-6 py-6 sm:px-7">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#7b8f75]">
            ARS Demand Forecast Engine
          </p>
          <h2 className="mt-3 text-[1.85rem] font-bold text-[#2f3b2c]">
            Manufacturing planner, report, and proof layer
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[#687561]">
            Forecast future demand, translate it into suggested manufacturing pace, then export a planner-ready PDF that explains what to increase, hold, or slow down.
          </p>
        </div>

        <div className="px-6 py-6 sm:px-7">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setSourceMode('live')
                setError(null)
                setFeedback('Live data mode selected.')
                if (preview?.summary.sourceMode !== 'live') {
                  setPreview(null)
                }
              }}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition duration-300 ${
                sourceMode === 'live'
                  ? 'border-[#54715a] bg-[#54715a] text-white shadow-[0_12px_24px_rgba(84,113,90,0.18)]'
                  : 'border-[#d7e4d2] bg-[#f8fbf5] text-[#4f664d]'
              }`}
            >
              Live data mode
            </button>
            <button
              type="button"
              onClick={() => {
                setSourceMode('imported_bundle')
                setPreview(null)
                setError(null)
                setFeedback('Import mode selected. Upload an export ZIP bundle to reproduce a planning package.')
              }}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition duration-300 ${
                sourceMode === 'imported_bundle'
                  ? 'border-[#a96f41] bg-[#a96f41] text-white shadow-[0_12px_24px_rgba(169,111,65,0.18)]'
                  : 'border-[#eadfd3] bg-[#fffaf4] text-[#8a613a]'
              }`}
            >
              Imported export ZIP
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-[#3f4a37]">From date</span>
              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="w-full rounded-[1rem] border border-[#d5dfcf] bg-[#fffdfb] px-4 py-3 text-sm text-[#2f3b2c] outline-none transition duration-300 focus:border-[#8aa477]"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-[#3f4a37]">To date</span>
              <input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="w-full rounded-[1rem] border border-[#d5dfcf] bg-[#fffdfb] px-4 py-3 text-sm text-[#2f3b2c] outline-none transition duration-300 focus:border-[#8aa477]"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-[#3f4a37]">Planning window</span>
              <select
                value={planningWindow}
                onChange={(event) => setPlanningWindow(event.target.value)}
                className="w-full rounded-[1rem] border border-[#d5dfcf] bg-[#fffdfb] px-4 py-3 text-sm text-[#2f3b2c] outline-none transition duration-300 focus:border-[#8aa477]"
              >
                {planningOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-[#3f4a37]">Product focus</span>
              <select
                value={productId}
                onChange={(event) => setProductId(event.target.value)}
                className="w-full rounded-[1rem] border border-[#d5dfcf] bg-[#fffdfb] px-4 py-3 text-sm text-[#2f3b2c] outline-none transition duration-300 focus:border-[#8aa477]"
              >
                {productOptions.map((option) => (
                  <option key={option.value || 'all-products'} value={option.value}>
                    {option.sku ? `${option.label} (${option.sku})` : option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-[#3f4a37]">Backtest days</span>
              <input
                type="number"
                min="1"
                max="90"
                step="1"
                value={backtestDays}
                onChange={(event) => setBacktestDays(event.target.value)}
                className="w-full rounded-[1rem] border border-[#d5dfcf] bg-[#fffdfb] px-4 py-3 text-sm text-[#2f3b2c] outline-none transition duration-300 focus:border-[#8aa477]"
              />
            </label>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.72fr)]">
            <div className="rounded-[1.2rem] border border-[#e8ddd1] bg-[#fffaf4] px-4 py-4 text-sm text-[#6d645c]">
              <p className="font-semibold text-[#3f4a37]">Planning interpretation</p>
              <p className="mt-2 leading-7">
                The current horizon is <span className="font-semibold text-[#2f3b2c]">{forecastDays} days</span>. This view turns future demand into suggested manufacturing cases per day, with safety stock built into the recommendation layer.
              </p>
              <p className="mt-2 leading-7">
                Product focus is currently set to <span className="font-semibold text-[#2f3b2c]">{selectedProductLabel}</span>.
              </p>
            </div>

            <label className={`space-y-2 ${sourceMode === 'imported_bundle' ? '' : 'opacity-65'}`}>
              <span className="text-sm font-semibold text-[#3f4a37]">Import export ZIP bundle</span>
              <input
                type="file"
                accept=".zip,application/zip"
                disabled={sourceMode !== 'imported_bundle'}
                onChange={(event) => {
                  const nextFile = event.target.files?.[0] ?? null
                  setBundleFile(nextFile)
                  setPreview(null)
                  setError(null)
                  if (nextFile) {
                    setFeedback(`${nextFile.name} is ready for imported forecast mode.`)
                  }
                }}
                className="block w-full rounded-[1rem] border border-dashed border-[#d7c7b8] bg-[#fffdfb] px-4 py-3 text-sm text-[#6d645c] file:mr-4 file:rounded-full file:border-0 file:bg-[#f3e6d7] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#7b5b3d]"
              />
              <p className="text-xs leading-6 text-[#8d7f74]">
                Imported mode reads the export package directly so the planner can reproduce the exact package that was downloaded from the Exports page.
              </p>
            </label>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void loadPreview()}
              disabled={isLoading}
              className="rounded-[1rem] bg-[#54715a] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(84,113,90,0.18)] transition duration-300 hover:bg-[#455f4a] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? 'Running planner...' : 'Run forecast planner'}
            </button>
            <button
              type="button"
              onClick={() => void downloadReport()}
              disabled={isDownloading}
              className="rounded-[1rem] border border-[#b8c8b0] bg-white px-5 py-3 text-sm font-semibold text-[#455f4a] transition duration-300 hover:border-[#8aa477] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isDownloading ? 'Preparing PDF...' : 'Download planner PDF'}
            </button>
          </div>

          {preview ? (
            <div className="mt-5 rounded-[1.15rem] border border-[#d9e4d5] bg-[#f7fbf5] px-4 py-4 text-sm text-[#55714b]">
              <p className="font-semibold text-[#39503b]">{preview.sourceSummary.label}</p>
              <p className="mt-1 leading-6">{preview.sourceSummary.note}</p>
              {preview.sourceSummary.packageName ? (
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#7b8f75]">
                  Package: {preview.sourceSummary.packageName}
                </p>
              ) : null}
            </div>
          ) : null}

          {feedback ? (
            <div className="mt-5 rounded-[1rem] border border-[#cfe2c8] bg-[#f3fbef] px-4 py-3 text-sm text-[#4d6c45]">
              {feedback}
            </div>
          ) : null}
          {error ? (
            <div className="mt-5 rounded-[1rem] border border-[#ebc0bb] bg-[#fff2f1] px-4 py-3 text-sm text-[#92524b]">
              {error}
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Forecast rows"
          value={formatNumber(summary?.forecastRows, 0)}
          hint="Future SKU/date demand rows included in this planner horizon."
        />
        <MetricCard
          label="Avg confidence"
          value={formatPercent(summary?.averageConfidenceScore)}
          hint={confidenceMeaning(summary?.averageConfidenceScore)}
        />
        <MetricCard
          label="Avg WAPE"
          value={formatPercent(summary?.averageWape)}
          hint={wapeMeaning(summary?.averageWape)}
        />
        <MetricCard
          label="Exceptions"
          value={formatNumber(summary?.exceptions, 0)}
          hint="Forecast rows that still need manual planner review before committing production."
        />
        <MetricCard
          label="AI signals"
          value={formatNumber(summary?.aiSignals, 0)}
          hint="Field-note or disruption clues that can change how the number should be interpreted."
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)]">
        <article className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#7b8f75]">
            Planner story
          </p>
          <h3 className="mt-3 text-[1.55rem] font-bold text-[#2f3b2c]">
            {plannerBrief?.title ?? 'Manufacturing outlook for the selected horizon'}
          </h3>
          <p className="mt-3 text-sm leading-7 text-[#51604d]">
            {plannerBrief?.headline ?? 'Run the planner to translate forecast demand into suggested manufacturing actions.'}
          </p>
          <p className="mt-3 rounded-[1.2rem] border border-[#dce8d7] bg-[#f7fbf5] px-4 py-4 text-sm leading-7 text-[#566652]">
            {plannerBrief?.executiveSummary ?? 'The planner PDF will summarize what to increase, hold, or slow down and why the system is making that recommendation.'}
          </p>

          <div className="mt-5 grid gap-3">
            {(plannerBrief?.topics ?? []).map((topic) => (
              <div key={topic.title} className="rounded-[1.1rem] border border-[#eadfd3] bg-[#fffaf4] px-4 py-4">
                <p className="text-sm font-semibold text-[#3f4a37]">{topic.title}</p>
                <p className="mt-2 text-sm leading-7 text-[#6d645c]">{topic.detail}</p>
              </div>
            ))}
            {!plannerBrief?.topics.length ? (
              <div className="rounded-[1.1rem] border border-[#e4ecdf] bg-[#f8fbf5] px-4 py-4 text-sm text-[#687561]">
                Planner topics will appear after the forecast is generated.
              </div>
            ) : null}
          </div>
        </article>

        <article className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#7b8f75]">
                Future Manufacture Line
              </p>
              <h3 className="mt-2 text-[1.35rem] font-bold text-[#2f3b2c]">
                Suggested manufacture pace
              </h3>
            </div>
            <p className="text-sm text-[#687561]">{summary?.modelVersion ?? 'ARS-HYBRID-WMA-1.0'}</p>
          </div>

          <p className="mt-3 text-sm leading-7 text-[#687561]">
            The orange line shows how many cases should be manufactured across the selected horizon. Product scope: {selectedProductLabel}.
          </p>

          <div className="mt-5">
            <ManufactureLineChart
              plan={manufacturePlan}
              productLabel={selectedProductLabel}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-5 text-sm text-[#5d6d60]">
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#b6793f]" />
              Suggested manufacture
            </span>
          </div>

          {scopeStatus?.allZeroBuild ? (
            <div className="mt-4 rounded-[1rem] border border-[#d7e4d2] bg-[#f8fbf5] px-4 py-4 text-sm text-[#5d6d60]">
              {scopeStatus.totalForecastCases > 0 ? (
                <p className="leading-7">
                  This zero line is currently a real planner result, not a chart error. Across the visible scope, projected demand is{' '}
                  <span className="font-semibold text-[#2f3b2c]">
                    {formatNumber(scopeStatus.totalForecastCases)}
                  </span>{' '}
                  cases and required demand plus safety stock is{' '}
                  <span className="font-semibold text-[#2f3b2c]">
                    {formatNumber(scopeStatus.totalRequiredCases)}
                  </span>{' '}
                  cases, while current stock already sits at{' '}
                  <span className="font-semibold text-[#2f3b2c]">
                    {formatNumber(scopeStatus.totalCurrentStockCases)}
                  </span>{' '}
                  cases.
                </p>
              ) : (
                <p className="leading-7">
                  This zero line is currently a real planner result, not a chart error. The selected scope is forecasting no cases in this horizon, so no additional manufacture is needed right now.
                </p>
              )}
            </div>
          ) : null}

          <div className="mt-5 grid gap-3">
            {manufactureSummary.map((item) => (
              <div
                key={item.id}
                className="rounded-[1rem] border border-[#eadfd3] bg-[#fffaf4] px-4 py-4 text-sm text-[#6d645c]"
              >
                <p className="font-semibold text-[#2f3b2c]">
                  {item.totalCases > 0
                    ? `Manufacture ${formatNumber(item.totalCases)} cases of ${item.productLabel}`
                    : `No additional manufacture needed for ${item.productLabel}`}
                </p>
                <p className="mt-2 leading-6">
                  {item.totalCases > 0
                    ? `Plan window: ${item.horizonStart} to ${item.horizonEnd} | Suggested pace: ${formatNumber(item.dailyCases)} cases per day`
                    : `Plan window: ${item.horizonStart} to ${item.horizonEnd} | Current stock ${formatNumber(item.currentStockCases)} cases already covers the required ${formatNumber(item.requiredCases)} cases.`}
                </p>
              </div>
            ))}
            {manufactureSummary.length === 0 ? (
              <div className="rounded-[1rem] border border-[#d5dfcf] bg-[#f8fbf5] px-4 py-4 text-sm text-[#687561]">
                Manufacture quantities will appear here after the planner generates product recommendations.
              </div>
            ) : null}
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <article className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#7b8f75]">
                Recommended actions
              </p>
              <h3 className="mt-2 text-[1.35rem] font-bold text-[#2f3b2c]">
                What to make and why
              </h3>
            </div>
            <p className="text-sm text-[#687561]">
              Horizon {summary?.forecastStartDate ?? '...'} to {summary?.forecastEndDate ?? '...'}
            </p>
          </div>

          <div className="mt-5 grid gap-4">
            {recommendations.map((recommendation) => (
              <RecommendationCard
                key={recommendation.recommendation_id}
                recommendation={recommendation}
              />
            ))}
            {recommendations.length === 0 ? (
              <div className="rounded-[1rem] border border-[#d5dfcf] bg-[#f8fbf5] px-4 py-4 text-sm text-[#687561]">
                No manufacturing recommendations are available for the selected filters yet.
              </div>
            ) : null}
          </div>
        </article>

        <article className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#7b8f75]">
            Exceptions
          </p>
          <h3 className="mt-2 text-[1.35rem] font-bold text-[#2f3b2c]">
            What still needs planner caution
          </h3>
          <div className="mt-5 grid gap-3">
            {exceptionRows.map((row) => (
              <div
                key={row.exception_id}
                className={`rounded-[1rem] border px-4 py-4 text-sm ${severityClassName(row.severity)}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold">{row.exception_type}</p>
                  <span className="text-xs uppercase tracking-[0.18em]">{row.severity}</span>
                </div>
                <p className="mt-2 leading-6">{row.reason}</p>
                <p className="mt-2 text-xs leading-6 opacity-90">{row.recommended_action}</p>
              </div>
            ))}
            {exceptionRows.length === 0 ? (
              <div className="rounded-[1rem] border border-[#d5dfcf] bg-[#f8fbf5] px-4 py-4 text-sm text-[#687561]">
                No forecast exceptions in the current preview.
              </div>
            ) : null}
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
        <article className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#7b8f75]">
                Forecast output
              </p>
              <h3 className="mt-2 text-[1.35rem] font-bold text-[#2f3b2c]">
                Next demand signals
              </h3>
            </div>
            <p className="text-sm text-[#687561]">
              Product filter: {selectedProductLabel}
            </p>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[#e4ecdf] text-xs uppercase tracking-[0.14em] text-[#76866e]">
                <tr>
                  <th className="py-3 pr-4">Date</th>
                  <th className="py-3 pr-4">Type</th>
                  <th className="py-3 pr-4">Product</th>
                  <th className="py-3 pr-4">Forecast</th>
                  <th className="py-3 pr-4">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef3ea] text-[#40503a]">
                {topForecasts.map((row) => (
                  <tr key={row.forecast_id}>
                    <td className="py-3 pr-4 font-medium">{row.forecast_date}</td>
                    <td className="py-3 pr-4">{formatDemandType(row.demand_type)}</td>
                    <td className="py-3 pr-4">{row.product_name}</td>
                    <td className="py-3 pr-4 font-semibold">{formatNumber(row.forecast_cases)} cases</td>
                    <td className="py-3 pr-4">
                      {formatPercent(row.confidence_score)} {row.confidence_level}
                    </td>
                  </tr>
                ))}
                {topForecasts.length === 0 ? (
                  <tr>
                    <td className="py-6 text-[#687561]" colSpan={5}>
                      No forecast rows are available for the selected window yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>

        <article className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#7b8f75]">
            AI signal layer
          </p>
          <h3 className="mt-2 text-[1.35rem] font-bold text-[#2f3b2c]">
            Notes and disruption clues
          </h3>
          <div className="mt-5 grid gap-3">
            {aiRows.map((row) => (
              <div key={row.explanation_id} className="rounded-[1rem] border border-[#e4ecdf] bg-[#f8fbf5] px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold text-[#2f3b2c]">{row.extracted_signal}</p>
                  <p className="text-sm text-[#687561]">{formatPercent(row.confidence_score)}</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#687561]">{row.business_explanation}</p>
              </div>
            ))}
            {aiRows.length === 0 ? (
              <div className="rounded-[1rem] border border-[#d5dfcf] bg-[#f8fbf5] px-4 py-4 text-sm text-[#687561]">
                No field-note signals were extracted in the current window.
              </div>
            ) : null}
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#7b8f75]">
            Backtesting
          </p>
          <h3 className="mt-2 text-[1.35rem] font-bold text-[#2f3b2c]">
            How recent forecasts matched reality
          </h3>
          <div className="mt-5 grid gap-3">
            {accuracyRows.map((row) => (
              <div
                key={`${row.demand_type}-${row.product_id}-${row.territory_id ?? 'none'}`}
                className="rounded-[1rem] border border-[#e4ecdf] bg-[#f8fbf5] px-4 py-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold text-[#2f3b2c]">{row.product_name}</p>
                  <p className="text-sm text-[#687561]">{formatDemandType(row.demand_type)}</p>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-[#687561] sm:grid-cols-3">
                  <p>Actual: <span className="font-semibold text-[#40503a]">{formatNumber(row.actual_cases)}</span></p>
                  <p>Forecast: <span className="font-semibold text-[#40503a]">{formatNumber(row.forecast_cases)}</span></p>
                  <p>WAPE: <span className="font-semibold text-[#40503a]">{formatPercent(row.wape)}</span></p>
                </div>
              </div>
            ))}
            {accuracyRows.length === 0 ? (
              <div className="rounded-[1rem] border border-[#d5dfcf] bg-[#f8fbf5] px-4 py-4 text-sm text-[#687561]">
                Backtesting needs at least a few historical demand points in the selected window, or a live-data run instead of an imported bundle.
              </div>
            ) : null}
          </div>
        </article>

        <article className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#7b8f75]">
            Confidence meaning
          </p>
          <h3 className="mt-2 text-[1.35rem] font-bold text-[#2f3b2c]">
            How to read the score in planning terms
          </h3>
          <div className="mt-5 grid gap-3">
            <MeaningCard
              title="High confidence"
              body="Use the quantity as a strong planning input. Still confirm stock and local events, but the number is closer to decision-grade."
            />
            <MeaningCard
              title="Medium confidence"
              body="Trust the direction more than the exact number. It can guide increases or slowdowns, but planners should still apply business context."
            />
            <MeaningCard
              title="Low confidence"
              body="Treat the row as a risk flag. It may show where demand exists, but it should not drive manufacturing automatically."
            />
          </div>
        </article>
      </section>
    </div>
  )
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <article className={`${surfaceClassName} px-5 py-5`}>
      <p className="text-sm font-semibold text-[#687561]">{label}</p>
      <p className="mt-2 text-[1.65rem] font-bold text-[#2f3b2c]">{value}</p>
      <p className="mt-3 text-sm leading-6 text-[#6d645c]">{hint}</p>
    </article>
  )
}

function RecommendationCard({
  recommendation,
}: {
  recommendation: PlannerRecommendation
}) {
  return (
    <div className="rounded-[1.2rem] border border-[#eadfd3] bg-[#fffdfb] px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-[#2f3b2c]">{recommendation.product_name}</p>
          <p className="mt-1 text-sm leading-6 text-[#6d645c]">
            {recommendation.reason_summary}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.16em] ${actionClassName(recommendation.action)}`}>
            {recommendation.action}
          </span>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.16em] ${urgencyClassName(recommendation.urgency)}`}>
            {recommendation.urgency}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat label="Forecast cases" value={formatNumber(recommendation.forecast_cases)} />
        <MiniStat label="Current stock" value={formatNumber(recommendation.current_stock_cases)} />
        <MiniStat label="Build needed" value={formatNumber(recommendation.recommended_production_cases)} />
        <MiniStat label="Daily pace" value={formatNumber(recommendation.suggested_daily_manufacture_cases)} />
      </div>

      <div className="mt-4 grid gap-2">
        {recommendation.reasons.slice(0, 3).map((reason) => (
          <p key={reason} className="rounded-[0.95rem] border border-[#e7ece3] bg-[#f8fbf5] px-3 py-2 text-sm leading-6 text-[#556452]">
            {reason}
          </p>
        ))}
      </div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] border border-[#e6ece2] bg-[#f7fbf5] px-3 py-3">
      <p className="text-xs uppercase tracking-[0.16em] text-[#7b8f75]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-[#2f3b2c]">{value}</p>
    </div>
  )
}

function MeaningCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[1rem] border border-[#e4ecdf] bg-[#f8fbf5] px-4 py-4">
      <p className="font-semibold text-[#2f3b2c]">{title}</p>
      <p className="mt-2 text-sm leading-7 text-[#687561]">{body}</p>
    </div>
  )
}

function ManufactureLineChart({
  plan,
  productLabel,
}: {
  plan: ManufacturePlanPoint[]
  productLabel: string
}) {
  const { cadence, points } = aggregatePlanForChart(plan)
  const unitLabel =
    cadence === 'monthly' ? 'cases per month' : cadence === 'weekly' ? 'cases per week' : 'cases per day'
  const viewWidth = 640
  const viewHeight = 260
  const chartLeft = 56
  const chartRight = 16
  const chartTop = 26
  const chartBottom = 44
  const innerWidth = viewWidth - chartLeft - chartRight
  const innerHeight = viewHeight - chartTop - chartBottom

  if (points.length === 0) {
    return (
      <div className="rounded-[1.2rem] border border-[#d5dfcf] bg-[#f8fbf5] px-4 py-10 text-sm text-[#687561]">
        The manufacture line will appear after a forecast run produces future rows.
      </div>
    )
  }

  const values = points.flatMap((point) => [
    point.recommended_manufacture_cases,
  ])
  const maxValue = Math.max(1, ...values)

  const manufacturePath = linePath(
    points,
    innerWidth,
    innerHeight,
    maxValue,
    (point) => point.recommended_manufacture_cases,
  )

  const tickIndexes = Array.from(
    new Set([
      0,
      Math.floor((points.length - 1) / 3),
      Math.floor((points.length - 1) * 2 / 3),
      points.length - 1,
    ]),
  )

  return (
    <svg viewBox={`0 0 ${viewWidth} ${viewHeight}`} className="w-full overflow-visible">
      <defs>
        <linearGradient id="forecastLineFill" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f3d4b5" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
        </linearGradient>
      </defs>

      <rect
        x="0.5"
        y="0.5"
        width={viewWidth - 1}
        height={viewHeight - 1}
        rx="20"
        fill="#fffdfb"
        stroke="#eadfd3"
      />

      {[0, 1, 2, 3].map((index) => {
        const y = chartTop + (innerHeight / 3) * index
        return (
          <line
            key={index}
            x1={chartLeft}
            y1={y}
            x2={viewWidth - chartRight}
            y2={y}
            stroke="#e8efe4"
            strokeWidth="1"
          />
        )
      })}

      {[0, 1, 2, 3].map((index) => {
        const value = maxValue - (maxValue / 3) * index
        const y = chartTop + (innerHeight / 3) * index + 4
        return (
          <text
            key={`y-${index}`}
            x={10}
            y={y}
            fontSize="11"
            fill="#7a8772"
          >
            {formatNumber(value, 1)}
          </text>
        )
      })}

      <g transform={`translate(${chartLeft}, ${chartTop})`}>
        <path
          d={`${manufacturePath} L ${innerWidth} ${innerHeight} L 0 ${innerHeight} Z`}
          fill="url(#forecastLineFill)"
          opacity="0.3"
        />
        <path d={manufacturePath} fill="none" stroke="#b6793f" strokeWidth="3" strokeLinecap="round" />

        {points.map((point, index) => {
          const x =
            points.length === 1 ? innerWidth / 2 : (index / Math.max(1, points.length - 1)) * innerWidth
          const manufactureY =
            innerHeight -
            (point.recommended_manufacture_cases / maxValue) * innerHeight

          return (
            <g key={point.date}>
              <circle cx={x} cy={manufactureY} r="3.3" fill="#b6793f" />
            </g>
          )
        })}
      </g>

      {tickIndexes.map((index) => {
        const x =
          points.length === 1
            ? chartLeft + innerWidth / 2
            : chartLeft + (index / Math.max(1, points.length - 1)) * innerWidth
        return (
          <text
            key={`${points[index]?.date ?? index}-tick`}
            x={x}
            y={viewHeight - 10}
            textAnchor="middle"
            fontSize="11"
            fill="#7a8772"
          >
            {points[index] ? formatChartDateLabel(points[index].date, cadence) : ''}
          </text>
        )
      })}

      <text
        x={chartLeft}
        y="18"
        fontSize="11"
        fill="#7a8772"
      >
        Scope: {productLabel} | Unit: {unitLabel}
      </text>
      <text
        x={14}
        y={viewHeight / 2}
        fontSize="11"
        fill="#7a8772"
        transform={`rotate(-90 14 ${viewHeight / 2})`}
      >
        {unitLabel}
      </text>
      <text
        x={viewWidth / 2}
        y={viewHeight - 6}
        textAnchor="middle"
        fontSize="11"
        fill="#7a8772"
      >
        Forecast date
      </text>
    </svg>
  )
}
