import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getApiErrorMessage } from '../api/client'
import {
  fetchTeamOverview,
  type TeamOverviewRow,
} from '../api/fieldMonitoring'
import { fetchTerritories, type TerritoryRecord } from '../api/territories'
import { useAuth } from '../context/AuthContext'

// ─── helpers ─────────────────────────────────────────────────────────────────

function todayIso() {
  return new Date().toISOString().split('T')[0]
}

function fmtMins(mins: number) {
  if (mins <= 0) return '—'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function fmtRole(role: string) {
  return role
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ')
}

// ─── summary card ─────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string
  value: number | string
  accent: string
}) {
  return (
    <div className={`rounded-[1.4rem] border ${accent} bg-white px-5 py-4 shadow-[0_10px_28px_rgba(59,31,15,0.07)]`}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6c58]">{label}</p>
      <p className="mt-2 text-[2rem] font-bold tracking-[-0.04em] text-[#342015]">{value}</p>
    </div>
  )
}

// ─── status chip ──────────────────────────────────────────────────────────────

function ReportChip({ status }: { status: 'DRAFT' | 'SUBMITTED' | null }) {
  if (!status)
    return <span className="text-sm text-[#bfaea3]">—</span>
  if (status === 'SUBMITTED')
    return (
      <span className="inline-flex items-center rounded-full border border-[#a3e4bc] bg-[#e6f9ef] px-2.5 py-0.5 text-xs font-semibold text-[#1a6b3c]">
        Submitted
      </span>
    )
  return (
    <span className="inline-flex items-center rounded-full border border-[#d8d8d8] bg-[#f0f0f0] px-2.5 py-0.5 text-xs font-semibold text-[#6b6b6b]">
      Draft
    </span>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

export default function FieldMonitoring() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, isAuthLoading } = useAuth()
  const canAccessFieldMonitoring =
    user?.role === 'ADMIN' || user?.role === 'DEMAND_PLANNER'

  // filters
  const [date, setDate] = useState(searchParams.get('date') ?? todayIso())
  const [territoryId, setTerritoryId] = useState(searchParams.get('territoryId') ?? '')
  const [roleFilter, setRoleFilter] = useState(searchParams.get('role') ?? '')
  const [userFilter, setUserFilter] = useState('')

  // data
  const [rows, setRows] = useState<TeamOverviewRow[]>([])
  const [territories, setTerritories] = useState<TerritoryRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function load(d: string, tid: string) {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchTeamOverview(d, tid || undefined)
      setRows(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load team overview.'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTerritories()
      .then((r) => setTerritories(r.territories ?? []))
      .catch(() => setTerritories([]))
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const params: Record<string, string> = { date }
      if (territoryId) params.territoryId = territoryId
      if (roleFilter) params.role = roleFilter
      setSearchParams(params, { replace: true })
      void load(date, territoryId)
    }, 350)
  }, [date, territoryId, roleFilter])

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-[#6e5647]">
        Loading…
      </div>
    )
  }

  if (!user || !canAccessFieldMonitoring) {
    navigate('/admin/dashboard', { replace: true })
    return null
  }

  // derived: filtered rows
  const filtered = rows.filter((r) => {
    if (roleFilter && r.role !== roleFilter) return false
    if (userFilter && !r.userName.toLowerCase().includes(userFilter.toLowerCase())) return false
    return true
  })

  // summary stats
  const activeCount = rows.filter((r) => r.routeStarted && !r.routeClosed).length
  const startedCount = rows.filter((r) => r.routeStarted).length
  const closedCount = rows.filter((r) => r.routeClosed).length
  const skippedTotal = rows.reduce((acc, r) => acc + r.skipped, 0)
  const submittedCount = rows.filter((r) => r.reportStatus === 'SUBMITTED').length

  const uniqueRoles = [...new Set(rows.map((r) => r.role))].sort()

  return (
    <div className="min-h-screen bg-white text-[#1e130c]">
      {/* ── header ── */}
      <header className="sticky top-0 z-10 border-b border-[#ebdfd5] bg-white/90 backdrop-blur-sm px-5 py-4 sm:px-8">
        <div className="flex items-center gap-4">
          <button
            type="button"
            id="fm-back-btn"
            onClick={() => navigate('/admin/dashboard')}
            className="flex items-center gap-1.5 rounded-[0.85rem] border border-[#e6ccb8] bg-white px-3 py-2 text-sm font-semibold text-[#6e4d3b] transition duration-200 hover:border-[#c9976f]"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Dashboard
          </button>
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[#a37d63]">
              Portal / Field Operations Monitoring
            </p>
            <h1 className="text-xl font-bold tracking-[-0.04em] text-[#342015]">
              Field Operations Monitoring
            </h1>
          </div>
        </div>
      </header>

      <main className="px-5 py-7 sm:px-8 lg:px-10">
        {/* ── filter bar ── */}
        <div className="mb-6 flex flex-wrap items-end gap-3 rounded-[1.4rem] border border-[#ebdfd5] bg-[#fdfaf7] px-5 py-4 shadow-[0_8px_20px_rgba(59,31,15,0.05)]">
          {/* date */}
          <div>
            <label htmlFor="fm-date" className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6c58]">
              Date
            </label>
            <input
              id="fm-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-[0.75rem] border border-[#e6ccb8] bg-white px-3 py-2 text-sm text-[#5a4435] outline-none focus:border-[#cf9566]"
            />
          </div>

          {/* territory */}
          <div>
            <label htmlFor="fm-territory" className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6c58]">
              Territory
            </label>
            <select
              id="fm-territory"
              value={territoryId}
              onChange={(e) => setTerritoryId(e.target.value)}
              className="rounded-[0.75rem] border border-[#e6ccb8] bg-white px-3 py-2 text-sm text-[#5a4435] outline-none focus:border-[#cf9566]"
            >
              <option value="">All territories</option>
              {territories.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* role */}
          <div>
            <label htmlFor="fm-role" className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6c58]">
              Role
            </label>
            <select
              id="fm-role"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-[0.75rem] border border-[#e6ccb8] bg-white px-3 py-2 text-sm text-[#5a4435] outline-none focus:border-[#cf9566]"
            >
              <option value="">All roles</option>
              {uniqueRoles.map((r) => (
                <option key={r} value={r}>
                  {fmtRole(r)}
                </option>
              ))}
            </select>
          </div>

          {/* user search */}
          <div className="flex-1 min-w-[160px]">
            <label htmlFor="fm-user" className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6c58]">
              Search User
            </label>
            <input
              id="fm-user"
              type="text"
              placeholder="Name…"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-full rounded-[0.75rem] border border-[#e6ccb8] bg-white px-3 py-2 text-sm text-[#5a4435] outline-none focus:border-[#cf9566] placeholder:text-[#c4ada0]"
            />
          </div>

          <button
            id="fm-refresh-btn"
            type="button"
            onClick={() => void load(date, territoryId)}
            className="rounded-[0.75rem] border border-[#d7baa3] bg-white px-4 py-2 text-sm font-semibold text-[#6e4d3b] transition duration-200 hover:border-[#c9976f]"
          >
            Refresh
          </button>
        </div>

        {/* ── summary cards ── */}
        <div className="mb-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCard label="Active Users" value={activeCount} accent="border-[#a3e4bc]" />
          <SummaryCard label="Routes Started" value={startedCount} accent="border-[#bed3fc]" />
          <SummaryCard label="Routes Closed" value={closedCount} accent="border-[#d8d8d8]" />
          <SummaryCard label="Skipped Outlets" value={skippedTotal} accent="border-[#fad5a5]" />
          <SummaryCard label="Reports Submitted" value={submittedCount} accent="border-[#a3e4bc]" />
        </div>

        {/* ── error ── */}
        {error && (
          <div className="mb-5 rounded-[1rem] border border-[#ebc0bb] bg-[#fff2f1] px-5 py-3 text-sm text-[#92524b]">
            {error}
          </div>
        )}

        {/* ── table ── */}
        <div className="rounded-[1.5rem] border border-[#ebdfd5] bg-white shadow-[0_20px_48px_rgba(59,31,15,0.07)] overflow-hidden">
          {isLoading && (
            <div className="flex items-center justify-center py-16 text-sm text-[#a37d63]">
              <svg className="mr-2.5 h-5 w-5 animate-spin text-[#cf9566]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading field data…
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#fff4e8]">
                <svg viewBox="0 0 24 24" className="h-7 w-7 text-[#cf9566]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v4l3 3" />
                </svg>
              </div>
              <p className="text-base font-semibold text-[#4d3020]">No field activity found</p>
              <p className="mt-1 text-sm text-[#a37d63]">
                No field-role users match the current filters for {date}.
              </p>
            </div>
          )}

          {!isLoading && filtered.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-[#f0e6de] bg-[#fdf8f4]">
                    {['User Name', 'Role', 'Territory', 'Assigned Outlets', 'Completed', 'Skipped', 'Total Field Time', 'Report Status'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em] text-[#a37d63]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, idx) => (
                    <tr
                      key={row.userId}
                      id={`fm-row-${row.userId}`}
                      onClick={() =>
                        navigate(`/admin/field-monitoring/${row.userId}?date=${date}`)
                      }
                      className={`cursor-pointer border-b border-[#f5ede6] transition-colors hover:bg-[#fff6ee] ${idx % 2 === 0 ? '' : 'bg-[#fdfaf7]'}`}
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#d7965f] to-[#b86d35] text-xs font-bold text-white">
                            {row.userName.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-[#4d3020]">{row.userName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-[#6e5647]">{fmtRole(row.role)}</td>
                      <td className="px-4 py-3.5 text-[#6e5647]">{row.territory ?? '—'}</td>
                      <td className="px-4 py-3.5 text-center font-medium text-[#4d3020]">{row.assignedOutlets}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="font-semibold text-[#1a6b3c]">{row.completed}</span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={row.skipped > 0 ? 'font-semibold text-[#b45309]' : 'text-[#bfaea3]'}>
                          {row.skipped}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-[#6e5647]">{fmtMins(row.totalFieldTimeMinutes)}</td>
                      <td className="px-4 py-3.5">
                        <ReportChip status={row.reportStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
