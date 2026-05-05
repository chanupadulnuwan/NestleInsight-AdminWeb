import { useState } from 'react'
import { downloadArsDemandForecastExport } from '../api/exports'
import { getApiErrorMessage } from '../api/client'

const surfaceClassName =
  'rounded-[1.8rem] border border-[#ebdfd5] bg-white shadow-[0_20px_48px_rgba(59,31,15,0.08)]'

const outputGroups = [
  {
    title: 'Reference bundle',
    items: [
      'manifest.json',
      'data_dictionary.csv',
      'products.csv',
      'outlets.csv',
      'territories.csv',
      'warehouses.csv',
      'routes.csv',
      'calendar.csv',
    ],
  },
  {
    title: 'Transactional movement',
    items: [
      'orders.csv',
      'order_items.csv',
      'deliveries.csv',
      'delivery_items.csv',
      'returns.csv',
      'return_items.csv',
    ],
  },
  {
    title: 'Field and inventory observations',
    items: [
      'sales_rep_visits.csv',
      'osa_stock_counts.csv',
      'stockout_events.csv',
      'damaged_expired_counts.csv',
      'inventory_snapshots.csv',
    ],
  },
  {
    title: 'Promotions and demand outputs',
    items: [
      'promotions.csv',
      'promotion_products.csv',
      'estimated_retail_offtake.csv',
      'forecast_replenishment_demand.csv',
      'forecast_estimated_retail_offtake.csv',
      'forecast_demand_signals.csv',
    ],
  },
]

const forecastNotes = [
  'Replenishment demand stays separate from estimated retail offtake in every export.',
  'Retail offtake is calculated only between verified stock-count visits for the same shop and product.',
  'Negative retail offtake results are clamped to zero for reporting and still flagged as data-quality issues.',
]

export default function DemandForecastExportSection() {
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [forecastDays, setForecastDays] = useState('30')
  const [isDownloading, setIsDownloading] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleDownload = async () => {
    const trimmedFromDate = fromDate.trim()
    const trimmedToDate = toDate.trim()
    const parsedForecastDays = Number(forecastDays)

    if (
      !Number.isInteger(parsedForecastDays) ||
      parsedForecastDays < 1 ||
      parsedForecastDays > 180
    ) {
      setError('Forecast horizon must be a whole number between 1 and 180 days.')
      setFeedback(null)
      return
    }

    if (trimmedFromDate && trimmedToDate && trimmedFromDate > trimmedToDate) {
      setError('From date cannot be after the to date.')
      setFeedback(null)
      return
    }

    setIsDownloading(true)
    setError(null)
    setFeedback(null)

    try {
      const { blob, filename } = await downloadArsDemandForecastExport({
        fromDate: trimmedFromDate || undefined,
        toDate: trimmedToDate || undefined,
        forecastDays: parsedForecastDays,
      })

      const downloadUrl = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = downloadUrl
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 1000)

      setFeedback(
        `${filename} is ready. The bundle includes reference data, movement files, visit observations, and forecasting outputs.`,
      )
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          'Unable to generate the ARS demand forecast export right now.',
        ),
      )
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <article className={`${surfaceClassName} overflow-hidden`}>
          <div className="border-b border-[#efe1d5] bg-[linear-gradient(135deg,#fff4e6_0%,#fffaf5_45%,#ffffff_100%)] px-6 py-6 sm:px-7">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">
              ARS Demand Forecast Export
            </p>
            <h2 className="mt-3 text-[1.85rem] font-bold tracking-[-0.04em] text-[#4d3020]">
              Build the forecast package in one step
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#7f6657]">
              Generate the ZIP bundle for downstream forecasting with separated replenishment demand,
              estimated retail offtake, operational observations, and promotion context.
            </p>
          </div>

          <div className="px-6 py-6 sm:px-7">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-[#5c4030]">From date</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                  className="w-full rounded-[1rem] border border-[#e3cdbc] bg-[#fffdfb] px-4 py-3 text-sm text-[#4d3020] outline-none transition duration-300 focus:border-[#cf9566]"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-[#5c4030]">To date</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                  className="w-full rounded-[1rem] border border-[#e3cdbc] bg-[#fffdfb] px-4 py-3 text-sm text-[#4d3020] outline-none transition duration-300 focus:border-[#cf9566]"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-[#5c4030]">Forecast horizon</span>
                <input
                  type="number"
                  min="1"
                  max="180"
                  step="1"
                  value={forecastDays}
                  onChange={(event) => setForecastDays(event.target.value)}
                  className="w-full rounded-[1rem] border border-[#e3cdbc] bg-[#fffdfb] px-4 py-3 text-sm text-[#4d3020] outline-none transition duration-300 focus:border-[#cf9566]"
                />
              </label>
            </div>

            <div className="mt-5 rounded-[1.35rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4 text-sm leading-7 text-[#7f6657]">
              Leave the dates blank to export the full available history. Forecast horizon controls how many
              future daily rows are included in the forecast CSV files.
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

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleDownload()}
                disabled={isDownloading}
                className="rounded-[1rem] bg-[#8b5a3a] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(139,90,58,0.18)] transition duration-300 hover:bg-[#73492f] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isDownloading ? 'Preparing export...' : 'Download export ZIP'}
              </button>
            </div>
          </div>
        </article>

        <article className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">
            Most Important Outputs
          </p>
          <div className="mt-5 grid gap-4">
            <div className="rounded-[1.35rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4">
              <p className="text-sm font-semibold text-[#5c4030]">forecast_replenishment_demand.csv</p>
              <p className="mt-2 text-sm leading-6 text-[#7f6657]">
                Real shop-owner replenishment demand based on actual ordered quantities.
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4">
              <p className="text-sm font-semibold text-[#5c4030]">forecast_estimated_retail_offtake.csv</p>
              <p className="mt-2 text-sm leading-6 text-[#7f6657]">
                Estimated consumer demand built from stock movement between verified field visits.
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4">
              <p className="text-sm font-semibold text-[#5c4030]">forecast_demand_signals.csv</p>
              <p className="mt-2 text-sm leading-6 text-[#7f6657]">
                Side-by-side daily demand signals with stockout, promotion, and confidence indicators.
              </p>
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <article className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">
            Bundle Contents
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {outputGroups.map((group) => (
              <div
                key={group.title}
                className="rounded-[1.35rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4"
              >
                <p className="text-sm font-semibold text-[#5c4030]">{group.title}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {group.items.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-[#e4ccb8] bg-white px-3 py-1.5 text-xs font-medium text-[#6e4d3b]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">
            Core Rules
          </p>
          <div className="mt-5 grid gap-4">
            {forecastNotes.map((note) => (
              <div
                key={note}
                className="rounded-[1.35rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4 text-sm leading-7 text-[#7f6657]"
              >
                {note}
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  )
}
