import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getApiErrorMessage } from '../api/client'
import { fetchEmployeeDetail } from '../api/fieldMonitoring'
import { fetchTerritories } from '../api/territories'
import type { TerritoryRecord } from '../api/territories'
import {
  createPlannerReport,
  deletePlannerReport,
  deleteSavedReport,
  fetchCriticalReports,
  fetchDailyReportDetail,
  fetchPlannerReports,
  fetchReportInbox,
  fetchSavedReports,
  markReportAsRead,
  resolveCriticalReport,
  type CriticalReportItem,
  type DemandPlannerReport,
  type InboxReportItem,
  type SavedReportItem,
} from '../api/reportDashboard'
import {
  buildFallbackEmployeeDetail,
  downloadDailyReportPdf,
  openDailyReportPdf,
} from '../utils/reportDashboardPdf'

const surfaceClassName =
  'rounded-[1.8rem] border border-[#ebdfd5] bg-white shadow-[0_20px_48px_rgba(59,31,15,0.08)]'

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function SectionTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: string[]
  active: string
  onChange: (tab: string) => void
}) {
  return (
    <div className="flex gap-1 rounded-[1.2rem] bg-[#f7ede4] p-1.5">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={`flex-1 rounded-[0.9rem] px-4 py-2.5 text-sm font-semibold transition duration-200 ${
            active === tab
              ? 'bg-white text-[#4d3020] shadow-[0_2px_8px_rgba(59,31,15,0.12)]'
              : 'text-[#8a6c58] hover:text-[#4d3020]'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}

function Badge({ children, variant = 'neutral' }: { children: React.ReactNode; variant?: 'neutral' | 'warning' | 'critical' | 'success' }) {
  const cls = {
    neutral: 'bg-[#f0e8e0] text-[#7f6657]',
    warning: 'bg-[#fff3cd] text-[#7a5c00]',
    critical: 'bg-[#fde8e8] text-[#8b1a1a]',
    success: 'bg-[#e8f5e9] text-[#2e6e3a]',
  }[variant]
  return (
    <span className={`rounded-[0.6rem] px-2.5 py-1 text-xs font-semibold ${cls}`}>
      {children}
    </span>
  )
}

function inboxStatusBadge(report: InboxReportItem) {
  if (report.reviewStatus === 'CRITICAL') {
    return <Badge variant="critical">Critical</Badge>
  }

  if (report.reviewStatus === 'SAVED') {
    return <Badge variant="success">Saved</Badge>
  }

  if (report.reviewStatus === 'WARNED') {
    return <Badge variant="warning">Revision Requested</Badge>
  }

  if (report.reviewStatus === 'READ') {
    return <Badge variant="neutral">Read</Badge>
  }

  return <Badge variant="success">Submitted</Badge>
}

// ── Popup overlay ──────────────────────────────────────────────────────────────

function PopupOverlay({
  title,
  description,
  submitLabel,
  submitVariant = 'primary',
  onClose,
  onSubmit,
  children,
}: {
  title: string
  description: string
  submitLabel: string
  submitVariant?: 'primary' | 'danger'
  onClose: () => void
  onSubmit: () => void
  children?: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[1.5rem] border border-[#ebdfd5] bg-white p-6 shadow-[0_32px_80px_rgba(59,31,15,0.18)]">
        <h3 className="text-[1.1rem] font-bold tracking-[-0.02em] text-[#4d3020]">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-[#7f6657]">{description}</p>
        {children && <div className="mt-4">{children}</div>}
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-[1rem] border border-[#d7baa3] px-4 py-3 text-sm font-semibold text-[#6e4d3b] transition duration-200 hover:border-[#c9976f]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className={`flex-1 rounded-[1rem] px-4 py-3 text-sm font-semibold text-white transition duration-200 ${
              submitVariant === 'danger'
                ? 'bg-[#a03030] hover:bg-[#882828]'
                : 'bg-[#8b5a3a] hover:bg-[#73492f]'
            }`}
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Inbox Tab ──────────────────────────────────────────────────────────────────

function useDailyReportPdfActions() {
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [activePdfAction, setActivePdfAction] = useState<string | null>(null)

  const handlePdfAction = async (
    dailyReportId: string,
    action: 'view' | 'download',
  ) => {
    setPdfError(null)
    setActivePdfAction(`${action}:${dailyReportId}`)
    try {
      const reportDetail = await fetchDailyReportDetail(dailyReportId)
      let detailForPdf: Awaited<ReturnType<typeof fetchEmployeeDetail>>
      try {
        detailForPdf = await fetchEmployeeDetail(
          reportDetail.report.salesRep.id,
          reportDetail.report.reportDate,
        )
      } catch {
        detailForPdf = buildFallbackEmployeeDetail(reportDetail)
      }

      if (action === 'view') {
        openDailyReportPdf(detailForPdf)
      } else {
        downloadDailyReportPdf(detailForPdf)
      }
    } catch (e) {
      setPdfError(getApiErrorMessage(e, 'Failed to prepare report PDF.'))
    } finally {
      setActivePdfAction(null)
    }
  }

  const isPdfActionLoading = (
    dailyReportId: string,
    action: 'view' | 'download',
  ) => activePdfAction === `${action}:${dailyReportId}`

  return {
    pdfError,
    handleViewPdf: (dailyReportId: string) =>
      void handlePdfAction(dailyReportId, 'view'),
    handleDownloadPdf: (dailyReportId: string) =>
      void handlePdfAction(dailyReportId, 'download'),
    isPdfActionLoading,
  }
}

function ReportPdfButtons({
  dailyReportId,
  onViewPdf,
  onDownloadPdf,
  isViewLoading,
  isDownloadLoading,
}: {
  dailyReportId: string
  onViewPdf: (dailyReportId: string) => void
  onDownloadPdf: (dailyReportId: string) => void
  isViewLoading: boolean
  isDownloadLoading: boolean
}) {
  const isBusy = isViewLoading || isDownloadLoading

  return (
    <>
      <button
        type="button"
        onClick={() => onViewPdf(dailyReportId)}
        disabled={isBusy}
        className="rounded-[0.8rem] border border-[#d7baa3] px-3 py-1.5 text-xs font-semibold text-[#6e4d3b] transition duration-200 hover:border-[#c9976f] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isViewLoading ? 'Preparing PDF...' : 'View PDF'}
      </button>
      <button
        type="button"
        onClick={() => onDownloadPdf(dailyReportId)}
        disabled={isBusy}
        className="rounded-[0.8rem] border border-[#d7baa3] bg-[#fff9f5] px-3 py-1.5 text-xs font-semibold text-[#6e4d3b] transition duration-200 hover:border-[#c9976f] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isDownloadLoading ? 'Preparing PDF...' : 'Download PDF'}
      </button>
    </>
  )
}

function InboxTab() {
  const navigate = useNavigate()
  const [reports, setReports] = useState<InboxReportItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const {
    pdfError,
    handleViewPdf,
    handleDownloadPdf,
    isPdfActionLoading,
  } = useDailyReportPdfActions()

  const load = async () => {
    setIsLoading(true)
    setError(null)
    try {
      setReports(await fetchReportInbox())
    } catch (e) {
      setError(getApiErrorMessage(e, 'Failed to load inbox.'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const handleMarkRead = async (report: InboxReportItem) => {
    if (report.status !== 'SUBMITTED') {
      return
    }

    try {
      await markReportAsRead(report.id)
      setReports((prev) =>
        prev.map((r) => (r.id === report.id ? { ...r, isRead: true } : r)),
      )
    } catch (e) {
      setError(getApiErrorMessage(e, 'Failed to mark as read.'))
    }
  }

  if (isLoading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={load} />
  if (reports.length === 0) return <EmptyState message="No sales rep reports found." />

  return (
    <div className="grid gap-3">
      {pdfError && (
        <div className="rounded-[1rem] bg-[#fde8e8] px-4 py-3 text-sm font-semibold text-[#8b1a1a]">
          {pdfError}
        </div>
      )}
      {reports.map((report) => (
        <div
          key={report.id}
          className={`rounded-[1.3rem] border px-5 py-4 transition duration-200 ${
            report.isRead
              ? 'border-[#e8ddd5] bg-[#fdfaf7]'
              : 'border-[#d8c9bb] bg-white shadow-[0_4px_16px_rgba(59,31,15,0.07)]'
          }`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {!report.isRead && <Badge variant="warning">Unread</Badge>}
              {inboxStatusBadge(report)}
              <span className="text-sm font-bold text-[#4d3020]">
                {report.salesRep.firstName} {report.salesRep.lastName}
              </span>
              {report.salesRep.employeeId && (
                <span className="text-xs text-[#a37d63]">#{report.salesRep.employeeId}</span>
              )}
              <span className="text-xs text-[#8a6c58]">·</span>
              <span className="text-xs text-[#8a6c58]">
                {report.territory?.name ?? 'No territory'}
              </span>
              <span className="text-xs text-[#8a6c58]">·</span>
              <span className="text-xs text-[#8a6c58]">{formatDate(report.reportDate)}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <ReportPdfButtons
                dailyReportId={report.id}
                onViewPdf={handleViewPdf}
                onDownloadPdf={handleDownloadPdf}
                isViewLoading={isPdfActionLoading(report.id, 'view')}
                isDownloadLoading={isPdfActionLoading(report.id, 'download')}
              />
              {!report.isRead && report.status === 'SUBMITTED' && !report.reviewStatus && (
                <button
                  type="button"
                  onClick={() => void handleMarkRead(report)}
                  className="rounded-[0.8rem] border border-[#d7baa3] px-3 py-1.5 text-xs font-semibold text-[#6e4d3b] transition duration-200 hover:border-[#c9976f]"
                >
                  Mark as read
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate(`/admin/report-dashboard/review/${report.id}`)}
                className="rounded-[0.8rem] bg-[#8b5a3a] px-3 py-1.5 text-xs font-semibold text-white transition duration-200 hover:bg-[#73492f]"
              >
                Review
              </button>
            </div>
          </div>
          {report.repComments && (
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#7f6657]">
              {report.repComments}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Saved Reports Tab ──────────────────────────────────────────────────────────

function SavedReportsTab() {
  const navigate = useNavigate()
  const [reports, setReports] = useState<SavedReportItem[]>([])
  const [territories, setTerritories] = useState<TerritoryRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({ territoryId: '', startDate: '', endDate: '' })
  const [deleteTarget, setDeleteTarget] = useState<SavedReportItem | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const {
    pdfError,
    handleViewPdf,
    handleDownloadPdf,
    isPdfActionLoading,
  } = useDailyReportPdfActions()

  const requiredConfirmText = deleteTarget
    ? `${deleteTarget.dailyReport.salesRep.firstName} ${deleteTarget.dailyReport.salesRep.lastName} ${deleteTarget.dailyReport.reportDate}`
    : ''

  const load = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [data, terrs] = await Promise.all([
        fetchSavedReports({
          territoryId: filters.territoryId || undefined,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
        }),
        fetchTerritories(),
      ])
      setReports(data)
      setTerritories(terrs.territories)
    } catch (e) {
      setError(getApiErrorMessage(e, 'Failed to load saved reports.'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { void load() }, [filters])

  const handleDelete = async () => {
    if (!deleteTarget || deleteConfirmText !== requiredConfirmText) return
    setIsDeleting(true)
    try {
      await deleteSavedReport(deleteTarget.dailyReportId)
      setReports((prev) => prev.filter((r) => r.dailyReportId !== deleteTarget.dailyReportId))
      setDeleteTarget(null)
      setDeleteConfirmText('')
    } catch (e) {
      setError(getApiErrorMessage(e, 'Failed to delete report.'))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      {deleteTarget && (
        <PopupOverlay
          title="Delete saved report?"
          description={`To confirm, type the sales rep name and report date: "${requiredConfirmText}"`}
          submitLabel={isDeleting ? 'Deleting...' : 'Delete'}
          submitVariant="danger"
          onClose={() => { setDeleteTarget(null); setDeleteConfirmText('') }}
          onSubmit={() => void handleDelete()}
        >
          <input
            type="text"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder={requiredConfirmText}
            className="w-full rounded-[0.9rem] border border-[#d6dfd8] bg-[#fffdfb] px-4 py-3 text-sm text-[#2f4540] outline-none focus:border-[#a03030]"
          />
        </PopupOverlay>
      )}

      {pdfError && (
        <div className="mb-4 rounded-[1rem] bg-[#fde8e8] px-4 py-3 text-sm font-semibold text-[#8b1a1a]">
          {pdfError}
        </div>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <select
          value={filters.territoryId}
          onChange={(e) => setFilters((f) => ({ ...f, territoryId: e.target.value }))}
          className="rounded-[1rem] border border-[#d6dfd8] bg-[#fffdfb] px-4 py-2.5 text-sm text-[#2f4540] outline-none focus:border-[#6e9d94]"
        >
          <option value="">All territories</option>
          {territories.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <input
          type="date"
          value={filters.startDate}
          onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
          className="rounded-[1rem] border border-[#d6dfd8] bg-[#fffdfb] px-4 py-2.5 text-sm text-[#2f4540] outline-none focus:border-[#6e9d94]"
          placeholder="From date"
        />
        <input
          type="date"
          value={filters.endDate}
          onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
          className="rounded-[1rem] border border-[#d6dfd8] bg-[#fffdfb] px-4 py-2.5 text-sm text-[#2f4540] outline-none focus:border-[#6e9d94]"
          placeholder="To date"
        />
      </div>

      {isLoading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={load} /> : reports.length === 0 ? (
        <EmptyState message="No saved reports found." />
      ) : (
        <div className="grid gap-3">
          {reports.map((item) => {
            const territory = item.dailyReport.route?.territory
            return (
              <div key={item.id} className="rounded-[1.3rem] border border-[#e8ddd5] bg-white px-5 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-[#4d3020]">
                      {item.dailyReport.salesRep.firstName} {item.dailyReport.salesRep.lastName}
                    </span>
                    <span className="text-xs text-[#8a6c58]">·</span>
                    <span className="text-xs text-[#8a6c58]">
                      {territory?.name ?? 'No territory'}
                    </span>
                    <span className="text-xs text-[#8a6c58]">·</span>
                    <span className="text-xs text-[#8a6c58]">{formatDate(item.dailyReport.reportDate)}</span>
                    <Badge variant="success">Saved</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ReportPdfButtons
                      dailyReportId={item.dailyReportId}
                      onViewPdf={handleViewPdf}
                      onDownloadPdf={handleDownloadPdf}
                      isViewLoading={isPdfActionLoading(item.dailyReportId, 'view')}
                      isDownloadLoading={isPdfActionLoading(item.dailyReportId, 'download')}
                    />
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/report-dashboard/review/${item.dailyReportId}`)}
                      className="rounded-[0.8rem] border border-[#d7baa3] px-3 py-1.5 text-xs font-semibold text-[#6e4d3b] transition duration-200 hover:border-[#c9976f]"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(item)}
                      className="rounded-[0.8rem] bg-[#a03030] px-3 py-1.5 text-xs font-semibold text-white transition duration-200 hover:bg-[#882828]"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

// ── Critical Reports Tab ───────────────────────────────────────────────────────

function CriticalReportsTab() {
  const navigate = useNavigate()
  const [reports, setReports] = useState<CriticalReportItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const {
    pdfError,
    handleViewPdf,
    handleDownloadPdf,
    isPdfActionLoading,
  } = useDailyReportPdfActions()

  const load = async () => {
    setIsLoading(true)
    setError(null)
    try {
      setReports(await fetchCriticalReports())
    } catch (e) {
      setError(getApiErrorMessage(e, 'Failed to load critical reports.'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const handleResolve = async (item: CriticalReportItem) => {
    try {
      await resolveCriticalReport(item.dailyReportId)
      setReports((prev) => prev.filter((r) => r.dailyReportId !== item.dailyReportId))
    } catch (e) {
      setError(getApiErrorMessage(e, 'Failed to resolve report.'))
    }
  }

  if (isLoading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={load} />
  if (reports.length === 0) return <EmptyState message="No critical reports." />

  return (
    <div className="grid gap-3">
      {pdfError && (
        <div className="rounded-[1rem] bg-[#fde8e8] px-4 py-3 text-sm font-semibold text-[#8b1a1a]">
          {pdfError}
        </div>
      )}
      {reports.map((item) => {
        const territory = item.dailyReport.route?.territory
        return (
          <div key={item.id} className="rounded-[1.3rem] border border-[#f0cece] bg-[#fff8f8] px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="critical">Critical</Badge>
                  <span className="text-sm font-bold text-[#4d3020]">
                    {item.dailyReport.salesRep.firstName} {item.dailyReport.salesRep.lastName}
                  </span>
                  <span className="text-xs text-[#8a6c58]">·</span>
                  <span className="text-xs text-[#8a6c58]">{territory?.name ?? 'No territory'}</span>
                  <span className="text-xs text-[#8a6c58]">·</span>
                  <span className="text-xs text-[#8a6c58]">{formatDate(item.dailyReport.reportDate)}</span>
                </div>
                {item.criticalReason && (
                  <p className="mt-2 text-sm leading-6 text-[#8b1a1a]">
                    <span className="font-semibold">Why critical:</span> {item.criticalReason}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <ReportPdfButtons
                  dailyReportId={item.dailyReportId}
                  onViewPdf={handleViewPdf}
                  onDownloadPdf={handleDownloadPdf}
                  isViewLoading={isPdfActionLoading(item.dailyReportId, 'view')}
                  isDownloadLoading={isPdfActionLoading(item.dailyReportId, 'download')}
                />
                <button
                  type="button"
                  onClick={() => navigate(`/admin/report-dashboard/review/${item.dailyReportId}`)}
                  className="rounded-[0.8rem] border border-[#d7baa3] px-3 py-1.5 text-xs font-semibold text-[#6e4d3b] transition duration-200 hover:border-[#c9976f]"
                >
                  View
                </button>
                <button
                  type="button"
                  onClick={() => void handleResolve(item)}
                  className="rounded-[0.8rem] bg-[#8b5a3a] px-3 py-1.5 text-xs font-semibold text-white transition duration-200 hover:bg-[#73492f]"
                >
                  Take action
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Planner Submit Tab ─────────────────────────────────────────────────────────

function PlannerSubmitTab() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [attachment, setAttachment] = useState<File | null>(null)
  const [showCriticalPopup, setShowCriticalPopup] = useState(false)
  const [criticalReason, setCriticalReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleSave = async (isCritical = false) => {
    if (!title.trim() || !content.trim()) {
      setFeedback({ type: 'error', message: 'Title and content are required.' })
      return
    }
    if (isCritical && !criticalReason.trim()) return

    setIsSubmitting(true)
    setFeedback(null)
    try {
      await createPlannerReport({
        title: title.trim(),
        content: content.trim(),
        isCritical,
        criticalReason: isCritical ? criticalReason.trim() : undefined,
        attachment,
      })
      setTitle('')
      setContent('')
      setAttachment(null)
      setCriticalReason('')
      setShowCriticalPopup(false)
      setFeedback({ type: 'success', message: isCritical ? 'Report saved as critical.' : 'Report saved successfully.' })
    } catch (e) {
      setFeedback({ type: 'error', message: getApiErrorMessage(e, 'Failed to save report.') })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {showCriticalPopup && (
        <PopupOverlay
          title="Save as critical report"
          description="Describe why this report should be flagged as critical."
          submitLabel={isSubmitting ? 'Saving...' : 'Save as critical'}
          onClose={() => setShowCriticalPopup(false)}
          onSubmit={() => void handleSave(true)}
        >
          <textarea
            value={criticalReason}
            onChange={(e) => setCriticalReason(e.target.value)}
            rows={4}
            placeholder="Reason for critical status..."
            className="w-full rounded-[0.9rem] border border-[#d6dfd8] bg-[#fffdfb] px-4 py-3 text-sm text-[#2f4540] outline-none focus:border-[#6e9d94]"
          />
        </PopupOverlay>
      )}

      <div className="grid gap-4">
        {feedback && (
          <div className={`rounded-[1rem] px-4 py-3 text-sm font-semibold ${feedback.type === 'success' ? 'bg-[#e8f5e9] text-[#2e6e3a]' : 'bg-[#fde8e8] text-[#8b1a1a]'}`}>
            {feedback.message}
          </div>
        )}
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#3f5652]">Report title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter report title..."
            className="w-full rounded-[1rem] border border-[#d6dfd8] bg-[#fffdfb] px-4 py-3 text-sm text-[#2f4540] outline-none focus:border-[#6e9d94]"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#3f5652]">Report content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            placeholder="Write your report here..."
            className="w-full rounded-[1rem] border border-[#d6dfd8] bg-[#fffdfb] px-4 py-3 text-sm leading-6 text-[#2f4540] outline-none focus:border-[#6e9d94]"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#3f5652]">Attach PDF <span className="font-normal text-[#8a6c58]">(optional)</span></label>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
            className="w-full rounded-[1rem] border border-[#d6dfd8] bg-[#fffdfb] px-4 py-2.5 text-sm text-[#2f4540] file:mr-3 file:rounded-[0.6rem] file:border-0 file:bg-[#8b5a3a] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
          />
          {attachment && (
            <p className="mt-1.5 text-xs text-[#6e9d94]">{attachment.name} selected</p>
          )}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => void handleSave(false)}
            disabled={isSubmitting}
            className="rounded-[1rem] bg-[#8b5a3a] px-5 py-3 text-sm font-semibold text-white transition duration-200 hover:bg-[#73492f] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? 'Saving...' : 'Save report'}
          </button>
          <button
            type="button"
            onClick={() => setShowCriticalPopup(true)}
            disabled={isSubmitting}
            className="rounded-[1rem] border border-[#c9443a] px-5 py-3 text-sm font-semibold text-[#a03030] transition duration-200 hover:bg-[#fde8e8] disabled:cursor-not-allowed disabled:opacity-70"
          >
            Save as critical
          </button>
        </div>
      </div>
    </>
  )
}

// ── Planner Reports View Tab ───────────────────────────────────────────────────

function PlannerViewTab() {
  const [reports, setReports] = useState<DemandPlannerReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'critical' | 'normal'>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<DemandPlannerReport | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = async () => {
    setIsLoading(true)
    setError(null)
    try {
      setReports(await fetchPlannerReports({
        isCritical: filter === 'critical' ? true : filter === 'normal' ? false : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }))
    } catch (e) {
      setError(getApiErrorMessage(e, 'Failed to load reports.'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { void load() }, [filter, startDate, endDate])

  const handleDelete = async () => {
    if (!deleteTarget || deleteConfirmText !== deleteTarget.title) return
    setIsDeleting(true)
    try {
      await deletePlannerReport(deleteTarget.id)
      setReports((prev) => prev.filter((r) => r.id !== deleteTarget.id))
      setDeleteTarget(null)
      setDeleteConfirmText('')
    } catch (e) {
      setError(getApiErrorMessage(e, 'Failed to delete report.'))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      {deleteTarget && (
        <PopupOverlay
          title="Delete report?"
          description={`To confirm, type the report title: "${deleteTarget.title}"`}
          submitLabel={isDeleting ? 'Deleting...' : 'Delete'}
          submitVariant="danger"
          onClose={() => { setDeleteTarget(null); setDeleteConfirmText('') }}
          onSubmit={() => void handleDelete()}
        >
          <input
            type="text"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder={deleteTarget.title}
            className="w-full rounded-[0.9rem] border border-[#d6dfd8] bg-[#fffdfb] px-4 py-3 text-sm text-[#2f4540] outline-none focus:border-[#a03030]"
          />
        </PopupOverlay>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="rounded-[1rem] border border-[#d6dfd8] bg-[#fffdfb] px-4 py-2.5 text-sm text-[#2f4540] outline-none focus:border-[#6e9d94]"
        >
          <option value="all">All reports</option>
          <option value="critical">Critical only</option>
          <option value="normal">Normal only</option>
        </select>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="rounded-[1rem] border border-[#d6dfd8] bg-[#fffdfb] px-4 py-2.5 text-sm text-[#2f4540] outline-none focus:border-[#6e9d94]"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="rounded-[1rem] border border-[#d6dfd8] bg-[#fffdfb] px-4 py-2.5 text-sm text-[#2f4540] outline-none focus:border-[#6e9d94]"
        />
      </div>

      {isLoading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={load} /> : reports.length === 0 ? (
        <EmptyState message="No reports found." />
      ) : (
        <div className="grid gap-3">
          {reports.map((report) => (
            <div
              key={report.id}
              className={`rounded-[1.3rem] border px-5 py-4 ${report.isCritical ? 'border-[#f0cece] bg-[#fff8f8]' : 'border-[#e8ddd5] bg-white'}`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {report.isCritical && <Badge variant="critical">Critical</Badge>}
                    <span className="text-sm font-bold text-[#4d3020]">{report.title}</span>
                  </div>
                  <p className="mt-1 text-xs text-[#8a6c58]">
                    {report.author.firstName} {report.author.lastName}
                    {report.author.employeeId && ` · #${report.author.employeeId}`}
                    {' · '}{formatDate(report.createdAt)}
                  </p>
                  {report.isCritical && report.criticalReason && (
                    <p className="mt-2 text-sm text-[#8b1a1a]">
                      <span className="font-semibold">Why critical:</span> {report.criticalReason}
                    </p>
                  )}
                  {expandedId === report.id && (
                    <div className="mt-3 space-y-3">
                      <p className="whitespace-pre-wrap text-sm leading-6 text-[#4d3020]">{report.content}</p>
                      {report.attachmentUrl && (
                        <a
                          href={report.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-[0.8rem] border border-[#d7baa3] px-3 py-1.5 text-xs font-semibold text-[#6e4d3b] transition duration-200 hover:border-[#c9976f]"
                        >
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                          View attachment
                        </a>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expandedId === report.id ? null : report.id)}
                    className="rounded-[0.8rem] border border-[#d7baa3] px-3 py-1.5 text-xs font-semibold text-[#6e4d3b] transition duration-200 hover:border-[#c9976f]"
                  >
                    {expandedId === report.id ? 'Collapse' : 'Read'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(report)}
                    className="rounded-[0.8rem] bg-[#a03030] px-3 py-1.5 text-xs font-semibold text-white transition duration-200 hover:bg-[#882828]"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ── Shared helpers ─────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex items-center gap-2 py-8 text-sm text-[#8a6c58]">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#d7baa3] border-t-[#8b5a3a]" />
      Loading...
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col gap-3 py-6">
      <p className="text-sm text-[#8b1a1a]">{message}</p>
      <button type="button" onClick={onRetry} className="w-fit rounded-[0.8rem] border border-[#d7baa3] px-4 py-2 text-sm font-semibold text-[#6e4d3b]">
        Retry
      </button>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return <p className="py-8 text-sm text-[#8a6c58]">{message}</p>
}

// ── Root component ─────────────────────────────────────────────────────────────

type MainTab = 'Sales Rep Reports' | 'Demand Planner Reports'
type SalesRepSubTab = 'Inbox' | 'Saved Reports' | 'Critical Reports'
type PlannerSubTab = 'Submit Report' | 'View Reports'

export default function ReportDashboardSection() {
  const [mainTab, setMainTab] = useState<MainTab>('Sales Rep Reports')
  const [salesRepSubTab, setSalesRepSubTab] = useState<SalesRepSubTab>('Inbox')
  const [plannerSubTab, setPlannerSubTab] = useState<PlannerSubTab>('Submit Report')

  return (
    <div className="grid gap-6">
      <div className={`${surfaceClassName} overflow-hidden`}>
        <div className="px-6 py-6 sm:px-7">
          <SectionTabs
            tabs={['Sales Rep Reports', 'Demand Planner Reports']}
            active={mainTab}
            onChange={(t) => setMainTab(t as MainTab)}
          />
        </div>

        <div className="border-t border-[#f0e8e0] px-6 py-6 sm:px-7">
          {mainTab === 'Sales Rep Reports' ? (
            <div className="grid gap-5">
              <SectionTabs
                tabs={['Inbox', 'Saved Reports', 'Critical Reports']}
                active={salesRepSubTab}
                onChange={(t) => setSalesRepSubTab(t as SalesRepSubTab)}
              />
              <div>
                {salesRepSubTab === 'Inbox' && <InboxTab />}
                {salesRepSubTab === 'Saved Reports' && <SavedReportsTab />}
                {salesRepSubTab === 'Critical Reports' && <CriticalReportsTab />}
              </div>
            </div>
          ) : (
            <div className="grid gap-5">
              <SectionTabs
                tabs={['Submit Report', 'View Reports']}
                active={plannerSubTab}
                onChange={(t) => setPlannerSubTab(t as PlannerSubTab)}
              />
              <div>
                {plannerSubTab === 'Submit Report' && <PlannerSubmitTab />}
                {plannerSubTab === 'View Reports' && <PlannerViewTab />}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
