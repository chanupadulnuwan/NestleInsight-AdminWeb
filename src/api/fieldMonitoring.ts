import { apiClient } from './client'

// ─── Team Overview ────────────────────────────────────────────────────────────

export interface TeamOverviewRow {
  userId: string
  userName: string
  role: string
  territory: string | null
  territoryId: string | null
  assignedOutlets: number
  completed: number
  skipped: number
  totalFieldTimeMinutes: number
  routeStarted: boolean
  routeClosed: boolean
  reportStatus: 'DRAFT' | 'SUBMITTED' | null
  routeId: string | null
}

export async function fetchTeamOverview(date: string, territoryId?: string) {
  const params: Record<string, string> = { date }
  if (territoryId) params.territoryId = territoryId
  const { data } = await apiClient.get<TeamOverviewRow[]>(
    '/monitoring/field-ops/overview',
    { params },
  )
  return data
}

// ─── Employee Detail ──────────────────────────────────────────────────────────

export interface RouteStop {
  stopId: string
  sequence: number
  outletId: string
  outletName: string
  purpose: string
  status: string
  durationMinutes: number | null
  arrivedAt: string | null
  completedAt: string | null
  skippedAt: string | null
  reasonCode: string | null
  photoUrls: string[]
}

export interface SkipLogEntry {
  outletId: string
  outletName: string
  reasonCode: string
  time: string | null
}

export interface IncidentEntry {
  id: string
  incidentType: string
  severity: string
  description: string
  outletId: string | null
  time: string
}

export interface DailyReportSummary {
  id: string
  status: 'DRAFT' | 'SUBMITTED'
  reportDate: string
  submittedAt: string | null
  repComments: string | null
  routeSummary: Record<string, unknown> | null
  visitSummary: Record<string, unknown> | null
  deliverySummary: Record<string, unknown> | null
  incidentSummary: Record<string, unknown> | null
}

export interface EmployeeDetail {
  userId: string
  userName: string
  role: string | null
  territory: string | null
  territoryId: string | null
  route: {
    id: string
    status: string
    startedAt: string | null
    closedAt: string | null
  } | null
  routeTimeline: RouteStop[]
  skipLog: SkipLogEntry[]
  incidents: IncidentEntry[]
  dailyReport: DailyReportSummary | null
}

export async function fetchEmployeeDetail(userId: string, date: string) {
  const { data } = await apiClient.get<EmployeeDetail>(
    `/monitoring/field-ops/employee/${userId}`,
    { params: { date } },
  )
  return data
}
