import { useEffect, useState, type ReactNode } from 'react'
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet'
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
import { createDailyReportPdf } from '../utils/dailyReportPdf'

function todayIso() {
  return new Date().toISOString().split('T')[0]
}

function fmtTime(iso: string | null | undefined) {
  if (!iso) return '-'
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString()
}

function fmtRole(role: string | null | undefined) {
  if (!role) return '-'
  return role
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ')
}

function fmtMins(mins: number | null) {
  if (mins == null || mins <= 0) return '-'
  const hours = Math.floor(mins / 60)
  const minutes = mins % 60
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
}

function labelize(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

function displayValue(value: unknown) {
  if (value == null || value === '') {
    return '-'
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }
  if (typeof value === 'string' && /\d{4}-\d{2}-\d{2}/.test(value)) {
    return fmtDateTime(value)
  }
  return String(value)
}

const STATUS_CHIP: Record<string, string> = {
  pending: 'bg-[#f0f0f0] text-[#6b6b6b] border-[#d8d8d8]',
  in_progress: 'bg-[#e8f0fe] text-[#1a56db] border-[#bed3fc]',
  inprogress: 'bg-[#e8f0fe] text-[#1a56db] border-[#bed3fc]',
  completed: 'bg-[#e6f9ef] text-[#1a6b3c] border-[#a3e4bc]',
  skipped: 'bg-[#fff4e5] text-[#b45309] border-[#fad5a5]',
}

const SEVERITY_CHIP: Record<string, string> = {
  LOW: 'bg-[#e6f9ef] text-[#1a6b3c] border-[#a3e4bc]',
  MEDIUM: 'bg-[#fff4e5] text-[#b45309] border-[#fad5a5]',
  HIGH: 'bg-[#fef2f2] text-[#b91c1c] border-[#fca5a5]',
  CRITICAL: 'bg-[#fdf2ff] text-[#7e22ce] border-[#d8b4fe]',
}

const MAP_STATUS_STYLES: Record<
  string,
  { fill: string; stroke: string; label: string }
> = {
  completed: { fill: '#2f9b59', stroke: '#1f6f3f', label: 'Completed' },
  pending: { fill: '#d6a15f', stroke: '#a06a2d', label: 'Pending' },
  skipped: { fill: '#d15a4b', stroke: '#9f3c30', label: 'Skipped' },
  in_progress: { fill: '#4d8ed6', stroke: '#2c5f96', label: 'In Progress' },
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

function SeverityChip({ severity }: { severity: string }) {
  const cls = SEVERITY_CHIP[severity.toUpperCase()] ?? SEVERITY_CHIP.LOW

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {severity}
    </span>
  )
}

function Card({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return (
    <div
      id={id}
      className="rounded-[1.5rem] border border-[#ebdfd5] bg-white shadow-[0_16px_40px_rgba(59,31,15,0.07)]"
    >
      <div className="border-b border-[#f0e6de] px-5 py-4">
        <h3 className="text-[0.95rem] font-bold tracking-[-0.02em] text-[#4d3020]">{title}</h3>
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  )
}

function RouteTimeline({ stops }: { stops: RouteStop[] }) {
  if (stops.length === 0) {
    return <p className="text-sm text-[#bfaea3]">No route stops recorded for this date.</p>
  }

  return (
    <ol className="relative space-y-0">
      {stops.map((stop, index) => {
        const isLast = index === stops.length - 1

        return (
          <li key={stop.stopId} className="relative flex gap-4 pb-0">
            {!isLast && (
              <div className="absolute bottom-0 left-[15px] top-[32px] w-px bg-[#f0e6de]" />
            )}

            <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[#e6ccb8] bg-white text-xs font-bold text-[#8a6c58]">
              {stop.sequence}
            </div>

            <div
              className={`flex-1 rounded-[1rem] border border-[#f0e6de] bg-[#fdfaf7] px-4 py-3 ${!isLast ? 'mb-3' : ''}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-[#4d3020]">{stop.outletName}</p>
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

              {stop.photoUrls.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1.5 text-[0.65rem] font-bold uppercase tracking-wider text-[#a37d63]">
                    Visual Evidence
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {stop.photoUrls.map((url, photoIndex) => (
                      <a
                        key={`${stop.stopId}-${photoIndex}`}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="group relative h-16 w-16 overflow-hidden rounded-lg border border-[#e6ccb8] bg-[#f8f5f1]"
                      >
                        <img
                          src={url}
                          alt="Shelf evidence"
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/20">
                          <svg
                            viewBox="0 0 24 24"
                            className="h-4 w-4 text-white opacity-0 transition group-hover:opacity-100"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                          </svg>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function SkipLog({ entries }: { entries: SkipLogEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-[#bfaea3]">No skipped outlets.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#f0e6de]">
            {['Outlet', 'Reason Code', 'Time'].map((heading) => (
              <th
                key={heading}
                className="pb-2 text-left text-xs font-semibold uppercase tracking-[0.14em] text-[#a37d63]"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => (
            <tr key={`${entry.outletId}-${index}`} className="border-b border-[#f5ede6]">
              <td className="py-2.5 font-medium text-[#4d3020]">{entry.outletName}</td>
              <td className="py-2.5 text-[#6e5647]">
                <span className="rounded-md bg-[#f3e8d6] px-2 py-0.5 text-xs font-semibold text-[#6e4d3b]">
                  {entry.reasonCode}
                </span>
              </td>
              <td className="py-2.5 text-[#8a6c58]">{fmtTime(entry.time)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function IncidentList({ incidents }: { incidents: IncidentEntry[] }) {
  if (incidents.length === 0) {
    return <p className="text-sm text-[#bfaea3]">No incidents reported for this route.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#f0e6de]">
            {['Incident Type', 'Outlet', 'Time', 'Severity'].map((heading) => (
              <th
                key={heading}
                className="pb-2 text-left text-xs font-semibold uppercase tracking-[0.14em] text-[#a37d63]"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {incidents.map((incident) => (
            <tr key={incident.id} className="border-b border-[#f5ede6]">
              <td className="py-2.5 font-semibold text-[#4d3020]">
                {incident.incidentType.replace(/_/g, ' ')}
              </td>
              <td className="py-2.5 text-[#6e5647]">
                {incident.outletId ? `Outlet #${incident.outletId.slice(0, 6)}` : '-'}
              </td>
              <td className="py-2.5 text-[#8a6c58]">{fmtTime(incident.time)}</td>
              <td className="py-2.5">
                <SeverityChip severity={incident.severity} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ReportSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-[1rem] border border-[#f0e6de] bg-[#fffdfa] px-4 py-4">
      <h4 className="text-sm font-bold uppercase tracking-[0.14em] text-[#8a6c58]">{title}</h4>
      {children}
    </section>
  )
}

function SummaryGrid({
  entries,
  emptyMessage,
}: {
  entries: Array<[string, unknown]>
  emptyMessage: string
}) {
  if (entries.length === 0) {
    return <p className="text-sm text-[#bfaea3]">{emptyMessage}</p>
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded-[0.9rem] border border-[#f0e6de] bg-white px-4 py-3">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[#a37d63]">
            {labelize(key)}
          </p>
          <p className="mt-2 text-sm font-semibold text-[#4d3020]">{displayValue(value)}</p>
        </div>
      ))}
    </div>
  )
}

function GroupedCounts({
  title,
  entries,
}: {
  title: string
  entries: Array<[string, unknown]>
}) {
  if (entries.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#a37d63]">{title}</p>
      <div className="flex flex-wrap gap-2">
        {entries.map(([key, value]) => (
          <span
            key={key}
            className="inline-flex rounded-full border border-[#ead9ca] bg-[#f9f2eb] px-3 py-1 text-xs font-semibold text-[#6e4d3b]"
          >
            {labelize(key)}: {displayValue(value)}
          </span>
        ))}
      </div>
    </div>
  )
}

function DetailTable({
  title,
  items,
  emptyMessage,
}: {
  title: string
  items: Array<Record<string, unknown>>
  emptyMessage: string
}) {
  if (items.length === 0) {
    return <p className="text-sm text-[#bfaea3]">{emptyMessage}</p>
  }

  const columns = Array.from(
    items.reduce((keys, item) => {
      Object.keys(item).forEach((key) => keys.add(key))
      return keys
    }, new Set<string>()),
  )

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#a37d63]">{title}</p>
      <div className="overflow-x-auto rounded-[0.9rem] border border-[#f0e6de] bg-white">
        <table className="w-full text-sm">
          <thead className="bg-[#fdf6ef]">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className="px-3 py-2 text-left text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#a37d63]"
                >
                  {labelize(column)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={`${title}-${index}`} className="border-t border-[#f5ede6] align-top">
                {columns.map((column) => (
                  <td key={column} className="px-3 py-2 text-[#6e5647]">
                    {displayValue(item[column])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function scalarEntries(record: Record<string, unknown> | null, excludedKeys: string[] = []) {
  if (!record) {
    return []
  }

  return Object.entries(record)
    .filter(([, value]) => !Array.isArray(value) && !isRecord(value))
    .filter(([key]) => !excludedKeys.includes(key))
}

function arrayEntries(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key]
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter(isRecord)
}

function recordEntries(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key]
  if (!isRecord(value)) {
    return []
  }
  return Object.entries(value)
}

function DailyReportPanel({
  report,
  employee,
}: {
  report: EmployeeDetail['dailyReport']
  employee: Pick<EmployeeDetail, 'userName' | 'role' | 'territory'>
}) {
  if (!report) {
    return (
      <div className="rounded-[1rem] border border-[#f0e6de] bg-[#fdfaf7] px-4 py-4 text-sm text-[#bfaea3]">
        No report found for this date.
      </div>
    )
  }

  const viewPdf = () => {
    const pdf = createDailyReportPdf(employee, report)
    const url = URL.createObjectURL(pdf)
    window.open(url, '_blank', 'noopener,noreferrer')
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  const downloadPdf = () => {
    const pdf = createDailyReportPdf(employee, report)
    const url = URL.createObjectURL(pdf)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${employee.userName.replace(/\s+/g, '-').toLowerCase()}-${report.reportDate}-daily-report.pdf`
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-[1.1rem] border border-[#f0e6de] bg-[#fdfaf7] px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
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
            <span className="text-xs text-[#8a6c58]">Date: {report.reportDate}</span>
            <span className="text-xs text-[#8a6c58]">
              Submitted: {fmtDateTime(report.submittedAt)}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={viewPdf}
              className="rounded-[0.9rem] border border-[#d8c0ac] bg-white px-3 py-2 text-xs font-semibold text-[#6e4d3b] transition hover:border-[#b98b67]"
            >
              View PDF
            </button>
            <button
              type="button"
              onClick={downloadPdf}
              className="rounded-[0.9rem] bg-[#8b5a3a] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#73492f]"
            >
              Download PDF
            </button>
          </div>
        </div>

        {report.repComments && (
          <div className="rounded-[0.85rem] border border-[#f5dfc0] bg-[#fff4e8] px-4 py-3 text-sm leading-relaxed text-[#6e4d3b]">
            {report.repComments}
          </div>
        )}
      </div>

      <ReportSection title="Route Summary">
        <SummaryGrid
          entries={scalarEntries(report.routeSummary)}
          emptyMessage="No route summary was generated."
        />
      </ReportSection>

      <ReportSection title="Visit Summary">
        <SummaryGrid
          entries={scalarEntries(report.visitSummary, ['outlets'])}
          emptyMessage="No visit summary was generated."
        />
        <DetailTable
          title="Visited Outlets"
          items={arrayEntries(report.visitSummary, 'outlets')}
          emptyMessage="No outlet visit rows were recorded."
        />
      </ReportSection>

      <ReportSection title="OSA Summary">
        <SummaryGrid
          entries={scalarEntries(report.osaSummary, ['issues'])}
          emptyMessage="No OSA summary was generated."
        />
        <DetailTable
          title="OSA Issues"
          items={arrayEntries(report.osaSummary, 'issues')}
          emptyMessage="No OSA issues were recorded."
        />
      </ReportSection>

      <ReportSection title="Delivery Summary">
        <SummaryGrid
          entries={scalarEntries(report.deliverySummary, ['orders'])}
          emptyMessage="No delivery summary was generated."
        />
        <DetailTable
          title="Assisted Orders"
          items={arrayEntries(report.deliverySummary, 'orders')}
          emptyMessage="No assisted orders were recorded."
        />
      </ReportSection>

      <ReportSection title="Return Summary">
        <SummaryGrid
          entries={scalarEntries(report.returnSummary, ['items'])}
          emptyMessage="No return summary was generated."
        />
        <DetailTable
          title="Returned Items"
          items={arrayEntries(report.returnSummary, 'items')}
          emptyMessage="No return items were recorded."
        />
      </ReportSection>

      <ReportSection title="Incident Summary">
        <SummaryGrid
          entries={scalarEntries(report.incidentSummary, ['incidents', 'bySeverity', 'byType'])}
          emptyMessage="No incident summary was generated."
        />
        <GroupedCounts title="By Severity" entries={recordEntries(report.incidentSummary, 'bySeverity')} />
        <GroupedCounts title="By Type" entries={recordEntries(report.incidentSummary, 'byType')} />
        <DetailTable
          title="Incident Log"
          items={arrayEntries(report.incidentSummary, 'incidents')}
          emptyMessage="No incidents were recorded."
        />
      </ReportSection>
    </div>
  )
}

function normalizeStopStatus(status: string) {
  return status.toLowerCase().replace(/ /g, '_')
}

function getStopMapStyle(status: string) {
  const key = normalizeStopStatus(status)
  return MAP_STATUS_STYLES[key] ?? MAP_STATUS_STYLES.pending
}

function RouteMapBounds({ points }: { points: Array<[number, number]> }) {
  const map = useMap()

  useEffect(() => {
    if (points.length === 0) {
      return
    }
    if (points.length === 1) {
      map.setView(points[0], 13)
      return
    }
    map.fitBounds(points, { padding: [36, 36] })
  }, [map, points])

  return null
}

function OutletMapPanel({ stops }: { stops: RouteStop[] }) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'skipped'>('all')

  const mappableStops = stops.filter(
    (stop) => typeof stop.latitude === 'number' && typeof stop.longitude === 'number',
  )
  const filteredStops = mappableStops.filter((stop) => {
    if (statusFilter === 'all') {
      return true
    }
    return normalizeStopStatus(stop.status) === statusFilter
  })
  const routePoints = filteredStops.map(
    (stop) => [stop.latitude as number, stop.longitude as number] as [number, number],
  )
  const missingCoordinateCount = stops.length - mappableStops.length
  const statusCounts = {
    all: mappableStops.length,
    pending: mappableStops.filter((stop) => normalizeStopStatus(stop.status) === 'pending').length,
    completed: mappableStops.filter((stop) => normalizeStopStatus(stop.status) === 'completed').length,
    skipped: mappableStops.filter((stop) => normalizeStopStatus(stop.status) === 'skipped').length,
  }

  if (mappableStops.length === 0) {
    return (
      <div className="rounded-[1rem] border border-[#f0e6de] bg-[#fdfaf7] px-4 py-4 text-sm text-[#bfaea3]">
        No outlet coordinates are available for this route yet.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {([
            ['all', `All (${statusCounts.all})`],
            ['pending', `Pending (${statusCounts.pending})`],
            ['completed', `Completed (${statusCounts.completed})`],
            ['skipped', `Skipped (${statusCounts.skipped})`],
          ] as const).map(([value, label]) => {
            const selected = statusFilter === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  selected
                    ? 'border-[#8b5a3a] bg-[#8b5a3a] text-white'
                    : 'border-[#e6ccb8] bg-white text-[#6e4d3b] hover:border-[#c9976f]'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap gap-2">
          {Object.values(MAP_STATUS_STYLES).map((style) => (
            <span
              key={style.label}
              className="inline-flex items-center gap-2 rounded-full border border-[#ead9ca] bg-[#fff8f2] px-3 py-1 text-xs font-semibold text-[#6e4d3b]"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: style.fill }}
              />
              {style.label}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[0.95rem] border border-[#ead9ca] bg-[#fffaf7] px-4 py-3">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#a37d63]">
            Visible Stops
          </p>
          <p className="mt-2 text-base font-bold text-[#4d3020]">{filteredStops.length}</p>
        </div>
        <div className="rounded-[0.95rem] border border-[#ead9ca] bg-[#fffaf7] px-4 py-3">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#a37d63]">
            Planned Route
          </p>
          <p className="mt-2 text-sm font-semibold text-[#4d3020]">
            Sequence line across mapped outlet stops
          </p>
        </div>
        <div className="rounded-[0.95rem] border border-[#ead9ca] bg-[#fffaf7] px-4 py-3">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#a37d63]">
            Missing Coordinates
          </p>
          <p className="mt-2 text-base font-bold text-[#4d3020]">{missingCoordinateCount}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-[1.2rem] border border-[#ead9ca]">
        <MapContainer
          center={routePoints[0]}
          zoom={12}
          scrollWheelZoom={false}
          className="h-[26rem] w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <RouteMapBounds points={routePoints} />
          {routePoints.length > 1 ? (
            <Polyline
              positions={routePoints}
              pathOptions={{ color: '#9f8e83', weight: 3, opacity: 0.8 }}
            />
          ) : null}
          {filteredStops.map((stop) => {
            const style = getStopMapStyle(stop.status)
            return (
              <CircleMarker
                key={stop.stopId}
                center={[stop.latitude as number, stop.longitude as number]}
                radius={10}
                pathOptions={{
                  color: style.stroke,
                  fillColor: style.fill,
                  fillOpacity: 0.92,
                  weight: 3,
                }}
              >
                <Popup>
                  <div className="min-w-[220px] space-y-2 text-[#3a2417]">
                    <div>
                      <p className="text-sm font-bold">{stop.outletName}</p>
                      {stop.outletAddress ? (
                        <p className="text-xs text-[#7d6758]">{stop.outletAddress}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-[#f5ebe2] px-2 py-1 text-[11px] font-semibold">
                        Stop #{stop.sequence}
                      </span>
                      <span className="rounded-full bg-[#f5ebe2] px-2 py-1 text-[11px] font-semibold">
                        {style.label}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <p>Purpose: {stop.purpose}</p>
                      <p>Arrived: {fmtTime(stop.arrivedAt)}</p>
                      <p>Completed: {fmtTime(stop.completedAt)}</p>
                      <p>Skipped: {fmtTime(stop.skippedAt)}</p>
                      <p>Duration: {fmtMins(stop.durationMinutes)}</p>
                      <p>ETA: {stop.etaMinutes != null ? `${stop.etaMinutes} min` : '-'}</p>
                      <p>
                        Distance: {stop.distanceKm != null ? `${stop.distanceKm} km` : '-'}
                      </p>
                      {stop.reasonCode ? <p>Reason: {stop.reasonCode}</p> : null}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            )
          })}
        </MapContainer>
      </div>

      {missingCoordinateCount > 0 ? (
        <p className="text-xs text-[#a37d63]">
          Some outlets are not shown on the map because their coordinates are missing.
        </p>
      ) : null}
    </div>
  )
}

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
      .catch((requestError) =>
        setError(getApiErrorMessage(requestError, 'Failed to load employee detail.')),
      )
      .finally(() => setIsLoading(false))
  }, [userId, date])

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-[#6e5647]">
        Loading...
      </div>
    )
  }

  if (!user || user.role !== 'ADMIN') {
    navigate('/admin/dashboard', { replace: true })
    return null
  }

  return (
    <div className="min-h-screen bg-white text-[#1e130c]">
      <header className="sticky top-0 z-10 border-b border-[#ebdfd5] bg-white/90 px-5 py-4 backdrop-blur-sm sm:px-8">
        <div className="flex items-center gap-4">
          <button
            id="fme-back-btn"
            type="button"
            onClick={() => navigate(`/admin/field-monitoring?date=${date}`)}
            className="flex items-center gap-1.5 rounded-[0.85rem] border border-[#e6ccb8] bg-white px-3 py-2 text-sm font-semibold text-[#6e4d3b] transition duration-200 hover:border-[#c9976f]"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Team Overview
          </button>

          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[#a37d63]">
              Field Monitoring / {date}
            </p>
            <h1 className="text-xl font-bold tracking-[-0.04em] text-[#342015]">
              {isLoading ? 'Loading...' : detail?.userName ?? 'Employee Detail'}
            </h1>
            {detail && (
              <p className="text-xs text-[#8a6c58]">
                {fmtRole(detail.role)}
                {detail.territory ? ` · ${detail.territory}` : ''}
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="px-5 py-7 sm:px-8 lg:px-10">
        {isLoading && (
          <div className="flex items-center justify-center py-24 text-sm text-[#a37d63]">
            <svg className="mr-2.5 h-5 w-5 animate-spin text-[#cf9566]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading employee detail...
          </div>
        )}

        {!isLoading && error && (
          <div className="rounded-[1rem] border border-[#ebc0bb] bg-[#fff2f1] px-5 py-4 text-sm text-[#92524b]">
            {error}
          </div>
        )}

        {!isLoading && detail && (
          <div className="grid gap-5 xl:grid-cols-2">
            <div className="xl:col-span-1">
              <Card id="fme-timeline" title={`Route Timeline (${detail.routeTimeline.length} stops)`}>
                <RouteTimeline stops={detail.routeTimeline} />
              </Card>
            </div>

            <div className="flex flex-col gap-5 xl:col-span-1">
              <Card id="fme-map" title="Outlet Map">
                <OutletMapPanel stops={detail.routeTimeline} />
              </Card>

              <Card id="fme-report" title="Daily Report">
                <DailyReportPanel
                  report={detail.dailyReport}
                  employee={{
                    userName: detail.userName,
                    role: detail.role,
                    territory: detail.territory,
                  }}
                />
              </Card>
            </div>

            <div className="xl:col-span-2">
              <Card id="fme-skips" title={`Skip Log (${detail.skipLog.length} skipped)`}>
                <SkipLog entries={detail.skipLog} />
              </Card>
            </div>

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
