import { useEffect, useState } from 'react'
import {
  downloadForecastEngineReport,
  fetchForecastEnginePreview,
  type ForecastEnginePreview,
  type ForecastEngineParams,
  type ForecastExceptionRow,
  type ForecastOutputRow,
} from '../api/forecastEngine'
import { getApiErrorMessage } from '../api/client'

const surfaceClassName =
  'rounded-[1.8rem] border border-[#ebdfd5] bg-white shadow-[0_20px_48px_rgba(59,31,15,0.08)]'

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'N/A'
  }

  return `${Math.round(value * 100)}%`
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '0'
  }

  return value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
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

export default function DemandForecastEngineSection() {
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [forecastDays, setForecastDays] = useState('30')
  const [backtestDays, setBacktestDays] = useState('14')
  const [preview, setPreview] = useState<ForecastEnginePreview | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const readParams = (): ForecastEngineParams | null => {
    const parsedForecastDays = Number(forecastDays)
    const parsedBacktestDays = Number(backtestDays)
    const trimmedFromDate = fromDate.trim()
    const trimmedToDate = toDate.trim()

    if (
      !Number.isInteger(parsedForecastDays) ||
      parsedForecastDays < 1 ||
      parsedForecastDays > 180
    ) {
      setError('Forecast horizon must be a whole number between 1 and 180 days.')
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
      forecastDays: parsedForecastDays,
      backtestDays: parsedBacktestDays,
    }
  }

  const loadPreview = async () => {
    const params = readParams()
    if (!params) return

    setIsLoading(true)
    setError(null)
    setFeedback(null)

    try {
      const data = await fetchForecastEnginePreview(params)
      setPreview(data)
      setFeedback('Forecast engine preview refreshed.')
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          'Unable to run the ARS demand forecast engine right now.',
        ),
      )
    } finally {
      setIsLoading(false)
    }
  }

  const downloadReport = async () => {
    const params = readParams()
    if (!params) return

    setIsDownloading(true)
    setError(null)
    setFeedback(null)

    try {
      const { blob, filename } = await downloadForecastEngineReport(params)
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
      setError(
        getApiErrorMessage(
          requestError,
          'Unable to download the forecast engine report right now.',
        ),
      )
    } finally {
      setIsDownloading(false)
    }
  }

  useEffect(() => {
    void loadPreview()
  }, [])

  const summary = preview?.summary
  const topForecasts = preview?.forecastOutput.slice(0, 8) ?? []
  const exceptionRows = preview?.exceptions.slice(0, 5) ?? []
  const accuracyRows = preview?.accuracyReport.slice(0, 6) ?? []
  const aiRows = preview?.aiExplanations.slice(0, 5) ?? []

  return (
    <div className="grid gap-6">
      <section className={`${surfaceClassName} overflow-hidden`}>
        <div className="border-b border-[#efe1d5] bg-[linear-gradient(135deg,#eef6f2_0%,#fffaf4_52%,#ffffff_100%)] px-6 py-6 sm:px-7">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#7b8f75]">
            ARS Demand Forecast Engine
          </p>
          <h2 className="mt-3 text-[1.85rem] font-bold text-[#2f3b2c]">
            Hybrid forecast, confidence, and proof layer
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[#687561]">
            Run a statistical forecast over replenishment demand and estimated retail offtake, then review confidence,
            backtesting accuracy, exceptions, and field-note explanations.
          </p>
        </div>

        <div className="px-6 py-6 sm:px-7">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
              <span className="text-sm font-semibold text-[#3f4a37]">Forecast days</span>
              <input
                type="number"
                min="1"
                max="180"
                step="1"
                value={forecastDays}
                onChange={(event) => setForecastDays(event.target.value)}
                className="w-full rounded-[1rem] border border-[#d5dfcf] bg-[#fffdfb] px-4 py-3 text-sm text-[#2f3b2c] outline-none transition duration-300 focus:border-[#8aa477]"
              />
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

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void loadPreview()}
              disabled={isLoading}
              className="rounded-[1rem] bg-[#54715a] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(84,113,90,0.18)] transition duration-300 hover:bg-[#455f4a] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? 'Running forecast...' : 'Run forecast engine'}
            </button>
            <button
              type="button"
              onClick={() => void downloadReport()}
              disabled={isDownloading}
              className="rounded-[1rem] border border-[#b8c8b0] bg-white px-5 py-3 text-sm font-semibold text-[#455f4a] transition duration-300 hover:border-[#8aa477] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isDownloading ? 'Preparing report...' : 'Download report ZIP'}
            </button>
          </div>

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
        <MetricCard label="Forecast rows" value={formatNumber(summary?.forecastRows)} />
        <MetricCard label="Avg confidence" value={formatPercent(summary?.averageConfidenceScore)} />
        <MetricCard label="Avg WAPE" value={formatPercent(summary?.averageWape)} />
        <MetricCard label="Exceptions" value={formatNumber(summary?.exceptions)} />
        <MetricCard label="AI signals" value={formatNumber(summary?.aiSignals)} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
        <article className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#7b8f75]">
                Forecast Output
              </p>
              <h3 className="mt-2 text-[1.35rem] font-bold text-[#2f3b2c]">
                Next demand signals
              </h3>
            </div>
            <p className="text-sm text-[#687561]">{summary?.modelVersion ?? 'ARS-HYBRID-WMA-1.0'}</p>
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
                    <td className="py-3 pr-4">{formatPercent(row.confidence_score)} {row.confidence_level}</td>
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
            Exceptions
          </p>
          <div className="mt-5 grid gap-3">
            {exceptionRows.map((row) => (
              <div
                key={row.exception_id}
                className={`rounded-[1rem] border px-4 py-3 text-sm ${severityClassName(row.severity)}`}
              >
                <p className="font-semibold">{row.exception_type}</p>
                <p className="mt-1 leading-6">{row.reason}</p>
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

      <section className="grid gap-6 xl:grid-cols-2">
        <article className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#7b8f75]">
            Backtesting
          </p>
          <div className="mt-5 grid gap-3">
            {accuracyRows.map((row) => (
              <div key={`${row.demand_type}-${row.product_id}-${row.territory_id ?? 'none'}`} className="rounded-[1rem] border border-[#e4ecdf] bg-[#f8fbf5] px-4 py-4">
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
                Backtesting needs at least a few historical demand points in the selected window.
              </div>
            ) : null}
          </div>
        </article>

        <article className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#7b8f75]">
            AI Signal Layer
          </p>
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
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className={`${surfaceClassName} px-5 py-5`}>
      <p className="text-sm font-semibold text-[#687561]">{label}</p>
      <p className="mt-2 text-[1.65rem] font-bold text-[#2f3b2c]">{value}</p>
    </article>
  )
}
