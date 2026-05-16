import { apiClient } from './client'

// --- Types ---

export interface InboxSalesRep {
  id: string
  firstName: string
  lastName: string
  employeeId: string | null
}

export interface InboxTerritory {
  id: string
  name: string
}

export interface InboxReportItem {
  id: string
  status: 'DRAFT' | 'SUBMITTED'
  reportDate: string
  submittedAt: string | null
  repComments: string | null
  isRead: boolean
  reviewStatus: 'READ' | 'SAVED' | 'CRITICAL' | 'WARNED' | null
  salesRep: InboxSalesRep
  territory: InboxTerritory | null
  routeSummary: Record<string, unknown> | null
  visitSummary: Record<string, unknown> | null
}

export interface AdminReportReview {
  id: string
  dailyReportId: string
  status: 'READ' | 'SAVED' | 'CRITICAL' | 'WARNED'
  criticalReason: string | null
  warnedReason: string | null
  createdAt: string
  updatedAt: string
}

export interface SavedReportItem {
  id: string
  dailyReportId: string
  status: 'SAVED'
  criticalReason: string | null
  createdAt: string
  updatedAt: string
  dailyReport: {
    id: string
    reportDate: string
    submittedAt: string | null
    repComments: string | null
    routeSummaryJson: Record<string, unknown> | null
    visitSummaryJson: Record<string, unknown> | null
    salesRep: InboxSalesRep
    route?: { territory?: InboxTerritory }
  }
}

export interface CriticalReportItem {
  id: string
  dailyReportId: string
  status: 'CRITICAL'
  criticalReason: string | null
  createdAt: string
  updatedAt: string
  dailyReport: {
    id: string
    reportDate: string
    submittedAt: string | null
    repComments: string | null
    routeSummaryJson: Record<string, unknown> | null
    visitSummaryJson: Record<string, unknown> | null
    salesRep: InboxSalesRep
    route?: { territory?: InboxTerritory }
  }
}

export interface DailyReportDetail {
  report: {
    id: string
    status: 'DRAFT' | 'SUBMITTED'
    reportDate: string
    submittedAt: string | null
    repComments: string | null
    routeSummaryJson: Record<string, unknown> | null
    visitSummaryJson: Record<string, unknown> | null
    osaSummaryJson: Record<string, unknown> | null
    deliverySummaryJson: Record<string, unknown> | null
    returnSummaryJson: Record<string, unknown> | null
    incidentSummaryJson: Record<string, unknown> | null
    salesRep: InboxSalesRep
    route?: { territory?: InboxTerritory }
  }
  review: AdminReportReview | null
}

export interface DemandPlannerReport {
  id: string
  authorId: string
  title: string
  content: string
  isCritical: boolean
  criticalReason: string | null
  attachmentUrl: string | null
  createdAt: string
  updatedAt: string
  author: {
    id: string
    firstName: string
    lastName: string
    employeeId: string | null
  }
}

function expectArrayResponse<T>(data: unknown, message: string): T[] {
  if (!Array.isArray(data)) {
    throw new Error(message)
  }

  return data as T[]
}

// --- Inbox ---

export async function fetchReportInbox(): Promise<InboxReportItem[]> {
  const res = await apiClient.get('/report-dashboard/inbox')
  return expectArrayResponse<InboxReportItem>(
    res.data,
    'Unexpected report dashboard inbox response. Check the backend route or dev proxy.',
  )
}

export async function markReportAsRead(dailyReportId: string): Promise<AdminReportReview> {
  const res = await apiClient.patch<AdminReportReview>(
    `/report-dashboard/inbox/${dailyReportId}/mark-read`,
  )
  return res.data
}

export async function fetchDailyReportDetail(reportId: string): Promise<DailyReportDetail> {
  const res = await apiClient.get<DailyReportDetail>(`/report-dashboard/daily-report/${reportId}`)
  return res.data
}

export async function saveReport(dailyReportId: string): Promise<AdminReportReview> {
  const res = await apiClient.post<AdminReportReview>(
    `/report-dashboard/inbox/${dailyReportId}/save`,
  )
  return res.data
}

export async function saveCriticalReport(
  dailyReportId: string,
  reason: string,
): Promise<AdminReportReview> {
  const res = await apiClient.post<AdminReportReview>(
    `/report-dashboard/inbox/${dailyReportId}/save-critical`,
    { reason },
  )
  return res.data
}

export async function warnSalesRep(
  dailyReportId: string,
  reason: string,
): Promise<{ message: string }> {
  const res = await apiClient.post<{ message: string }>(
    `/report-dashboard/inbox/${dailyReportId}/warn`,
    { reason },
  )
  return res.data
}

// --- Saved Reports ---

export async function fetchSavedReports(filters?: {
  territoryId?: string
  salesRepId?: string
  startDate?: string
  endDate?: string
}): Promise<SavedReportItem[]> {
  const res = await apiClient.get('/report-dashboard/saved', {
    params: filters,
  })
  return expectArrayResponse<SavedReportItem>(
    res.data,
    'Unexpected saved reports response. Check the backend route or dev proxy.',
  )
}

export async function deleteSavedReport(dailyReportId: string): Promise<{ message: string }> {
  const res = await apiClient.delete<{ message: string }>(
    `/report-dashboard/saved/${dailyReportId}`,
  )
  return res.data
}

// --- Critical Reports ---

export async function fetchCriticalReports(): Promise<CriticalReportItem[]> {
  const res = await apiClient.get('/report-dashboard/critical')
  return expectArrayResponse<CriticalReportItem>(
    res.data,
    'Unexpected critical reports response. Check the backend route or dev proxy.',
  )
}

export async function resolveCriticalReport(dailyReportId: string): Promise<AdminReportReview> {
  const res = await apiClient.patch<AdminReportReview>(
    `/report-dashboard/critical/${dailyReportId}/resolve`,
  )
  return res.data
}

// --- Demand Planner Reports ---

export async function createPlannerReport(payload: {
  title: string
  content: string
  isCritical?: boolean
  criticalReason?: string
  attachment?: File | null
}): Promise<DemandPlannerReport> {
  const form = new FormData()
  form.append('title', payload.title)
  form.append('content', payload.content)
  if (payload.isCritical !== undefined) form.append('isCritical', String(payload.isCritical))
  if (payload.criticalReason) form.append('criticalReason', payload.criticalReason)
  if (payload.attachment) form.append('attachment', payload.attachment)

  const res = await apiClient.post<DemandPlannerReport>(
    '/report-dashboard/planner-reports',
    form,
  )
  return res.data
}

export async function fetchPlannerReports(filters?: {
  authorId?: string
  startDate?: string
  endDate?: string
  isCritical?: boolean
}): Promise<DemandPlannerReport[]> {
  const params: Record<string, string> = {}
  if (filters?.authorId) params.authorId = filters.authorId
  if (filters?.startDate) params.startDate = filters.startDate
  if (filters?.endDate) params.endDate = filters.endDate
  if (filters?.isCritical !== undefined) params.isCritical = String(filters.isCritical)

  const res = await apiClient.get('/report-dashboard/planner-reports', {
    params,
  })
  return expectArrayResponse<DemandPlannerReport>(
    res.data,
    'Unexpected planner reports response. Check the backend route or dev proxy.',
  )
}

export async function deletePlannerReport(reportId: string): Promise<{ message: string }> {
  const res = await apiClient.delete<{ message: string }>(
    `/report-dashboard/planner-reports/${reportId}`,
  )
  return res.data
}
