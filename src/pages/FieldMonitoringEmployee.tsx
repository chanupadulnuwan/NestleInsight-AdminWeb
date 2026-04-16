import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getApiErrorMessage } from '../api/client'
import {
  fetchEmployeeDetail,
  type EmployeeDetail,
  type IncidentEntry,
  type RouteStop,
  type SkipLogEntry,
} from '../api/fieldMonitoring'
import { useAuth } from '../context/AuthContext'

// ─── helpers ─────────────────────────────────────────────────────────────────

function todayIso() {
  return new Date().toISOString().split('T')[0]
}

function fmtTime(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fmtRole(role: string | null | undefined) {
  if (!role) return '—'
  return role
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ')
}

function fmtMins(mins: number | null) {
  if (mins == null || mins <= 0) return '—'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

// ─── stop status chip ─────────────────────────────────────────────────────────

const STATUS_CHIP: Record<string, string> = {
  pending: 'bg-[#f0f0f0] text-[#6b6b6b] border-[#d8d8d8]',
  in_progress: 'bg-[#e8f0fe] text-[#1a56db] border-[#bed3fc]',
  inprogress: 'bg-[#e8f0fe] text-[#1a56db] border-[#bed3fc]',
  completed: 'bg-[#e6f9ef] text-[#1a6b3c] border-[#a3e4bc]',
  skipped: 'bg-[#fff4e5] text-[#b45309] border-[#fad5a5]',
}

function StopChip({ status }: { status: string }) {
  const key = status.toLowerCase().replace(/ /g, '_')
  const cls = STATUS_CHIP[key] ?? STATUS_CHIP.pending
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')}
    </span>
  )
}

// ─── severity colours ─────────────────────────────────────────────────────────

const SEVERITY_CHIP: Record<string, string> = {
  LOW: 'bg-[#e6f9ef] text-[#1a6b3c] border-[#a3e4bc]',
  MEDIUM: 'bg-[#fff4e5] text-[#b45309] border-[#fad5a5]',
  HIGH: 'bg-[#fef2f2] text-[#b91c1c] border-[#fca5a5]',
  CRITICAL: 'bg-[#fdf2ff] text-[#7e22ce] border-[#d8b4fe]',
}

function SeverityChip({ severity }: { severity: string }) {
  const cls = SEVERITY_CHIP[severity.toUpperCase()] ?? SEVERITY_CHIP.LOW
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {severity}
    </span>
  )
}

// ─── section card wrapper ─────────────────────────────────────────────────────

function Card({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <div id={id} className="rounded-[1.5rem] border border-[#ebdfd5] bg-white shadow-[0_16px_40px_rgba(59,31,15,0.07)]">
      <div className="border-b border-[#f0e6de] px-5 py-4">
        <h3 className="text-[0.95rem] font-bold tracking-[-0.02em] text-[#4d3020]">{title}</h3>
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  )
}

// ─── Route Timeline ───────────────────────────────────────────────────────────

function RouteTimeline({ stops }: { stops: RouteStop[] }) {
  if (stops.length === 0) {
    return <p className="text-sm text-[#bfaea3]">No route stops recorded for this date.</p>
  }
  return (
    <ol className="relative space-y-0">
      {stops.map((stop, idx) => {
        const isLast = idx === stops.length - 1
        return (
          <li key={stop.stopId} className="relative flex gap-4 pb-0">
            {/* vertical line */}
            {!isLast && (
              <div className="absolute left-[15px] top-[32px] bottom-0 w-px bg-[#f0e6de]" />
            )}
            {/* circle */}
            <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[#e6ccb8] bg-white text-xs font-bold text-[#8a6c58]">
              {stop.sequence}
            </div>
            {/* content */}
            <div className={`flex-1 rounded-[1rem] border border-[#f0e6de] bg-[#fdfaf7] px-4 py-3 ${!isLast ? 'mb-3' : ''}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-[#4d3020] text-sm">{stop.outletName}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <span className="rounded-md bg-[#f3e8d6] px-2 py-0.5 text-xs font-medium text-[#6e4d3b]">
                      {stop.purpose}
                    </span>
                    <StopChip status={stop.status} />
                  </div>
                </div>
                <div className="text-right text-xs text-[#8a6c58]">
                  {stop.arrivedAt && <p>Arrived: {fmtTime(stop.arrivedAt)}</p>}
                  {stop.completedAt && <p>Done: {fmtTime(stop.completedAt)}</p>}
                  {stop.skippedAt && <p>Skipped: {fmtTime(stop.skippedAt)}</p>}
                  {stop.durationMinutes != null && (
                    <p className="font-semibold text-[#6e4d3b]">{fmtMins(stop.durationMinutes)}</p>
                  )}
                </div>
              </div>
              {stop.reasonCode && (
                <p className="mt-1.5 text-xs text-[#a37d63]">
                  Reason: <span className="font-semibold">{stop.reasonCode}</span>
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

// ─── Skip Log ─────────────────────────────────────────────────────────────────

function SkipLog({ entries }: { entries: SkipLogEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-[#bfaea3]">No skipped outlets.</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#f0e6de]">
            {['Outlet', 'Reason Code', 'Time'].map((h) => (
              <th key={h} className="pb-2 text-left text-xs font-semibold uppercase tracking-[0.14em] text-[#a37d63]">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={i} className="border-b border-[#f5ede6]">
              <td className="py-2.5 font-medium text-[#4d3020]">{e.outletName}</td>
              <td className="py-2.5 text-[#6e5647]">
                <span className="rounded-md bg-[#f3e8d6] px-2 py-0.5 text-xs font-semibold text-[#6e4d3b]">
                  {e.reasonCode}
                </span>
              </td>
              <td className="py-2.5 text-[#8a6c58]">{fmtTime(e.time)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Incident List ────────────────────────────────────────────────────────────

function IncidentList({ incidents }: { incidents: IncidentEntry[] }) {
  if (incidents.length === 0) {
    return <p className="text-sm text-[#bfaea3]">No incidents reported for this route.</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#f0e6de]">
            {['Incident Type', 'Outlet', 'Time', 'Severity'].map((h) => (
              <th key={h} className="pb-2 text-left text-xs font-semibold uppercase tracking-[0.14em] text-[#a37d63]">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {incidents.map((inc) => (
            <tr key={inc.id} className="border-b border-[#f5ede6]">
              <td className="py-2.5 font-semibold text-[#4d3020]">
                {inc.incidentType.replace(/_/g, ' ')}
              </td>
              <td className="py-2.5 text-[#6e5647]">{inc.outletId ? `Outlet #${inc.outletId.slice(0, 6)}` : '—'}</td>
              <td className="py-2.5 text-[#8a6c58]">{fmtTime(inc.time)}</td>
              <td className="py-2.5">
                <SeverityChip severity={inc.severity} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Daily Report Panel ───────────────────────────────────────────────────────

function DailyReportPanel({ report }: { report: EmployeeDetail['dailyReport'] }) {
  if (!report) {
    return (
      <div className="rounded-[1rem] border border-[#f0e6de] bg-[#fdfaf7] px-4 py-4 text-sm text-[#bfaea3]">
        No report found for this date.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
            report.status === 'SUBMITTED'
              ? 'border-[#a3e4bc] bg-[#e6f9ef] text-[#1a6b3c]'
              : 'border-[#d8d8d8] bg-[#f0f0f0] text-[#6b6b6b]'
          }`}
        >
          {report.status}
        </span>
        {report.submittedAt && (
          <span className="text-xs text-[#8a6c58]">
            Submitted at {fmtTime(report.submittedAt)}
          </span>
        )}
      </div>

      {report.repComments && (
        <div className="rounded-[0.85rem] bg-[#fff4e8] border border-[#f5dfc0] px-4 py-3 text-sm text-[#6e4d3b] leading-relaxed">
          {report.repComments}
        </div>
      )}

      {(report.routeSummary || report.visitSummary || report.deliverySummary) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {report.routeSummary && (
            <pre className="overflow-auto rounded-[0.85rem] bg-[#f8f5f1] px-4 py-3 text-xs text-[#6e5647] max-h-40">
              {JSON.stringify(report.routeSummary, null, 2)}
            </pre>
          )}
          {report.visitSummary && (
            <pre className="overflow-auto rounded-[0.85rem] bg-[#f8f5f1] px-4 py-3 text-xs text-[#6e5647] max-h-40">
              {JSON.stringify(report.visitSummary, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Outlet Map Placeholder ───────────────────────────────────────────────────

function OutletMapPlaceholder({ stopCount }: { stopCount: number }) {
  return (
    <div className="relative flex h-64 items-center justify-center overflow-hidden rounded-[1.2rem] border-2 border-dashed border-[#e6ccb8] bg-gradient-to-br from-[#fff8f0] to-[#fdf3e7]">
      {/* decorative dots */}
      {[
        { top: '20%', left: '30%' },
        { top: '55%', left: '60%' },
        { top: '35%', left: '70%' },
        { top: '70%', left: '25%' },
        { top: '45%', left: '45%' },
      ].map((pos, i) => (
        <div
          key={i}
          className="absolute h-3.5 w-3.5 rounded-full border-2 border-white bg-[#cf9566] shadow-md"
          style={{ top: pos.top, left: pos.left }}
        />
      ))}
      {/* connecting lines (SVG) */}
      <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
        <polyline
          points="30%,20% 45%,45% 60%,55% 70%,35% 25%,70%"
          fill="none"
          stroke="#e6ccb8"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />
      </svg>
      <div className="relative z-10 text-center">
        <div className="mb-2 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="h-8 w-8 text-[#cf9566]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
            <circle cx="12" cy="9" r="2.5" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-[#6e4d3b]">Route Map Visualization</p>
        <p className="mt-0.5 text-xs text-[#a37d63]">
          {stopCount} outlet{stopCount !== 1 ? 's' : ''} on today's route
        </p>
        <p className="mt-2 rounded-full bg-[#f3b539]/20 px-3 py-0.5 text-xs font-medium text-[#7a4f1a]">
          Leaflet / Mapbox integration coming soon
        </p>
      </div>
    </div>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

export default function FieldMonitoringEmployee() {
  const { userId } = useParams<{ userId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, isAuthLoading } = useAuth()

  const date = searchParams.get('date') ?? todayIso()

  const [detail, setDetail] = useState<EmployeeDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return
    setIsLoading(true)
    setError(null)
    fetchEmployeeDetail(userId, date)
      .then(setDetail)
      .catch((err) => setError(getApiErrorMessage(err, 'Failed to load employee detail.')))
      .finally(() => setIsLoading(false))
  }, [userId, date])

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-[#6e5647]">
        Loading…
      </div>
    )
  }

  if (!user || user.role !== 'ADMIN') {
    navigate('/admin/dashboard', { replace: true })
    return null
  }

  return (
    <div className="min-h-screen bg-white text-[#1e130c]">
      {/* ── header ── */}
      <header className="sticky top-0 z-10 border-b border-[#ebdfd5] bg-white/90 backdrop-blur-sm px-5 py-4 sm:px-8">
        <div className="flex items-center gap-4">
          <button
            id="fme-back-btn"
            type="button"
            onClick={() => navigate(`/admin/field-monitoring?date=${date}`)}
            className="flex items-center gap-1.5 rounded-[0.85rem] border border-[#e6ccb8] bg-white px-3 py-2 text-sm font-semibold text-[#6e4d3b] transition duration-200 hover:border-[#c9976f]"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Team Overview
          </button>
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[#a37d63]">
              Field Monitoring / {date}
            </p>
            <h1 className="text-xl font-bold tracking-[-0.04em] text-[#342015]">
              {isLoading ? 'Loading…' : (detail?.userName ?? 'Employee Detail')}
            </h1>
            {detail && (
              <p className="text-xs text-[#8a6c58]">
                {fmtRole(detail.role)}{detail.territory ? ` · ${detail.territory}` : ''}
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="px-5 py-7 sm:px-8 lg:px-10">
        {/* loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-24 text-sm text-[#a37d63]">
            <svg className="mr-2.5 h-5 w-5 animate-spin text-[#cf9566]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading employee detail…
          </div>
        )}

        {/* error */}
        {!isLoading && error && (
          <div className="rounded-[1rem] border border-[#ebc0bb] bg-[#fff2f1] px-5 py-4 text-sm text-[#92524b]">
            {error}
          </div>
        )}

        {/* content */}
        {!isLoading && detail && (
          <div className="grid gap-5 xl:grid-cols-2">
            {/* Route Timeline — full width on mobile, left col on desktop */}
            <div className="xl:col-span-1">
              <Card id="fme-timeline" title={`Route Timeline (${detail.routeTimeline.length} stops)`}>
                <RouteTimeline stops={detail.routeTimeline} />
              </Card>
            </div>

            {/* Right column */}
            <div className="flex flex-col gap-5 xl:col-span-1">
              {/* Outlet Map */}
              <Card id="fme-map" title="Outlet Map">
                <OutletMapPlaceholder stopCount={detail.routeTimeline.length} />
              </Card>

              {/* Daily Report */}
              <Card id="fme-report" title="Daily Report">
                <DailyReportPanel report={detail.dailyReport} />
              </Card>
            </div>

            {/* Skip Log — full width */}
            <div className="xl:col-span-2">
              <Card id="fme-skips" title={`Skip Log (${detail.skipLog.length} skipped)`}>
                <SkipLog entries={detail.skipLog} />
              </Card>
            </div>

            {/* Incidents — full width */}
            <div className="xl:col-span-2">
              <Card id="fme-incidents" title={`Incidents (${detail.incidents.length})`}>
                <IncidentList incidents={detail.incidents} />
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
