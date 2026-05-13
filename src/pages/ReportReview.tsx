import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getApiErrorMessage } from "../api/client";
import {
  fetchEmployeeDetail,
  type EmployeeDetail,
} from "../api/fieldMonitoring";
import {
  fetchDailyReportDetail,
  saveReport,
  saveCriticalReport,
  warnSalesRep,
  deleteSavedReport,
  type DailyReportDetail,
} from "../api/reportDashboard";
import { createDailyReportPdf } from "../utils/dailyReportPdf";

const surfaceClassName =
  "rounded-[1.8rem] border border-[#ebdfd5] bg-white shadow-[0_20px_48px_rgba(59,31,15,0.08)]";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="rounded-[1.2rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a37d63]">
        {label}
      </p>
      <p className="mt-1.5 text-[1.1rem] font-bold text-[#4d3020]">
        {value ?? "—"}
      </p>
    </div>
  );
}

function PopupOverlay({
  title,
  description,
  submitLabel,
  submitVariant = "primary",
  onClose,
  onSubmit,
  children,
}: {
  title: string;
  description: string;
  submitLabel: string;
  submitVariant?: "primary" | "danger";
  onClose: () => void;
  onSubmit: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[1.5rem] border border-[#ebdfd5] bg-white p-6 shadow-[0_32px_80px_rgba(59,31,15,0.18)]">
        <h3 className="text-[1.05rem] font-bold tracking-[-0.02em] text-[#4d3020]">
          {title}
        </h3>
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
              submitVariant === "danger"
                ? "bg-[#a03030] hover:bg-[#882828]"
                : "bg-[#8b5a3a] hover:bg-[#73492f]"
            }`}
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

type ActivePopup = "critical" | "warn" | "delete" | null;

export default function ReportReview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<DailyReportDetail | null>(null);
  const [pdfDetail, setPdfDetail] = useState<EmployeeDetail | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isActioning, setIsActioning] = useState(false);

  const [activePopup, setActivePopup] = useState<ActivePopup>(null);
  const [popupReason, setPopupReason] = useState("");

  useEffect(() => {
    if (!id) return;
    void load();
  }, [id]);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    setPdfDetail(null);
    try {
      const reportDetail = await fetchDailyReportDetail(id!);
      setData(reportDetail);
      setIsPdfLoading(true);
      try {
        const fullDetail = await fetchEmployeeDetail(
          reportDetail.report.salesRep.id,
          reportDetail.report.reportDate,
        );
        setPdfDetail(fullDetail);
      } catch {
        setPdfDetail(buildFallbackEmployeeDetail(reportDetail));
      } finally {
        setIsPdfLoading(false);
      }
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to load report."));
      setIsPdfLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewPdf = () => {
    const detailForPdf =
      pdfDetail ?? (data ? buildFallbackEmployeeDetail(data) : null);
    if (!detailForPdf) return;
    const pdf = createDailyReportPdf(detailForPdf);
    const url = URL.createObjectURL(pdf);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const handleDownloadPdf = () => {
    const detailForPdf =
      pdfDetail ?? (data ? buildFallbackEmployeeDetail(data) : null);
    if (!detailForPdf) return;
    const pdf = createDailyReportPdf(detailForPdf);
    const url = URL.createObjectURL(pdf);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${detailForPdf.userName.replace(/\s+/g, "-").toLowerCase()}-${detailForPdf.dailyReport?.reportDate ?? "daily-report"}-daily-report.pdf`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const handleSave = async () => {
    if (!id) return;
    setIsActioning(true);
    setActionError(null);
    try {
      await saveReport(id);
      setActionSuccess("Report saved to your saved reports.");
    } catch (e) {
      setActionError(getApiErrorMessage(e, "Failed to save report."));
    } finally {
      setIsActioning(false);
    }
  };

  const handleSaveCritical = async () => {
    if (!id || !popupReason.trim()) return;
    setIsActioning(true);
    setActionError(null);
    try {
      await saveCriticalReport(id, popupReason.trim());
      setActivePopup(null);
      setPopupReason("");
      setActionSuccess("Report saved as critical.");
    } catch (e) {
      setActionError(getApiErrorMessage(e, "Failed to save as critical."));
    } finally {
      setIsActioning(false);
    }
  };

  const handleWarn = async () => {
    if (!id || !popupReason.trim()) return;
    setIsActioning(true);
    setActionError(null);
    try {
      await warnSalesRep(id, popupReason.trim());
      setActivePopup(null);
      setPopupReason("");
      setActionSuccess(
        "Sales rep has been notified. Returning to report dashboard...",
      );
      setTimeout(
        () => navigate("/admin/dashboard?section=report-dashboard"),
        2000,
      );
    } catch (e) {
      setActionError(getApiErrorMessage(e, "Failed to send notification."));
    } finally {
      setIsActioning(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setIsActioning(true);
    setActionError(null);
    try {
      await deleteSavedReport(id);
      setActivePopup(null);
      setActionSuccess("Report deleted. Returning...");
      setTimeout(
        () => navigate("/admin/dashboard?section=report-dashboard"),
        1500,
      );
    } catch (e) {
      setActionError(getApiErrorMessage(e, "Failed to delete report."));
    } finally {
      setIsActioning(false);
    }
  };

  const closePopup = () => {
    setActivePopup(null);
    setPopupReason("");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white px-4 py-8">
        <div className="mx-auto max-w-4xl flex items-center gap-2 text-sm text-[#8a6c58]">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#d7baa3] border-t-[#8b5a3a]" />
          Loading report...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-white px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm text-[#8b1a1a]">
            {error ?? "Report not found."}
          </p>
          <button
            type="button"
            onClick={() =>
              navigate("/admin/dashboard?section=report-dashboard")
            }
            className="mt-4 rounded-[1rem] border border-[#d7baa3] px-4 py-2 text-sm font-semibold text-[#6e4d3b]"
          >
            Back to Report Dashboard
          </button>
        </div>
      </div>
    );
  }

  const { report, review } = data;
  const territory = report.route?.territory;
  const routeSummary = report.routeSummaryJson as Record<
    string,
    unknown
  > | null;
  const visitSummary = report.visitSummaryJson as Record<
    string,
    unknown
  > | null;
  const osaSummary = report.osaSummaryJson as Record<string, unknown> | null;
  const deliverySummary = report.deliverySummaryJson as Record<
    string,
    unknown
  > | null;
  const incidentSummary = report.incidentSummaryJson as Record<
    string,
    unknown
  > | null;

  const isSaved = review?.status === "SAVED";

  return (
    <>
      {/* Critical popup */}
      {activePopup === "critical" && (
        <PopupOverlay
          title="Save as critical report"
          description="Explain why this report should be flagged as critical. This reason will be visible to reviewers."
          submitLabel={isActioning ? "Saving..." : "Save as critical"}
          onClose={closePopup}
          onSubmit={() => void handleSaveCritical()}
        >
          <textarea
            value={popupReason}
            onChange={(e) => setPopupReason(e.target.value)}
            rows={4}
            placeholder="Reason for critical status..."
            className="w-full rounded-[0.9rem] border border-[#d6dfd8] bg-[#fffdfb] px-4 py-3 text-sm text-[#2f4540] outline-none focus:border-[#6e9d94]"
          />
        </PopupOverlay>
      )}

      {/* Warn popup */}
      {activePopup === "warn" && (
        <PopupOverlay
          title="Request report revision"
          description="Describe the issue with this report. An AI-assisted alert will be sent to the sales rep and the report will be removed from inbox."
          submitLabel={isActioning ? "Sending..." : "Send & remove"}
          onClose={closePopup}
          onSubmit={() => void handleWarn()}
        >
          <textarea
            value={popupReason}
            onChange={(e) => setPopupReason(e.target.value)}
            rows={4}
            placeholder="What needs to be corrected or resubmitted?"
            className="w-full rounded-[0.9rem] border border-[#d6dfd8] bg-[#fffdfb] px-4 py-3 text-sm text-[#2f4540] outline-none focus:border-[#6e9d94]"
          />
        </PopupOverlay>
      )}

      {/* Delete popup */}
      {activePopup === "delete" && (
        <PopupOverlay
          title="Delete report?"
          description="This will permanently remove the saved report. This action cannot be undone."
          submitLabel={isActioning ? "Deleting..." : "Delete"}
          submitVariant="danger"
          onClose={closePopup}
          onSubmit={() => void handleDelete()}
        />
      )}

      <div className="min-h-screen bg-[#fdf8f4] px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Back nav */}
          <button
            type="button"
            onClick={() =>
              navigate("/admin/dashboard?section=report-dashboard")
            }
            className="flex items-center gap-2 text-sm font-semibold text-[#8a6c58] transition duration-200 hover:text-[#4d3020]"
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
            Back to Report Dashboard
          </button>

          {/* Action feedback */}
          {actionSuccess && (
            <div className="rounded-[1rem] bg-[#e8f5e9] px-4 py-3 text-sm font-semibold text-[#2e6e3a]">
              {actionSuccess}
            </div>
          )}
          {actionError && (
            <div className="rounded-[1rem] bg-[#fde8e8] px-4 py-3 text-sm font-semibold text-[#8b1a1a]">
              {actionError}
            </div>
          )}

          {/* Header */}
          <div className={surfaceClassName + " px-6 py-6 sm:px-7"}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">
                  Daily Report Review
                </p>
                <h1 className="mt-2 text-[1.6rem] font-bold tracking-[-0.04em] text-[#4d3020]">
                  {report.salesRep.firstName} {report.salesRep.lastName}
                </h1>
                <div className="mt-1.5 flex flex-wrap gap-3 text-sm text-[#7f6657]">
                  {territory && <span>{territory.name}</span>}
                  {report.salesRep.employeeId && (
                    <span>#{report.salesRep.employeeId}</span>
                  )}
                  <span>Report date: {formatDate(report.reportDate)}</span>
                  <span>Submitted: {formatDateTime(report.submittedAt)}</span>
                </div>
              </div>

              {/* Action bar */}
              <div className="flex flex-wrap gap-2 sm:shrink-0">
                <button
                  type="button"
                  onClick={handleViewPdf}
                  disabled={isPdfLoading}
                  className="rounded-[1rem] border border-[#d7baa3] bg-white px-4 py-2.5 text-sm font-semibold text-[#6e4d3b] transition duration-200 hover:border-[#c9976f] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPdfLoading ? "Preparing PDF..." : "View PDF"}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isPdfLoading}
                  className="rounded-[1rem] border border-[#d7baa3] bg-[#fff9f5] px-4 py-2.5 text-sm font-semibold text-[#6e4d3b] transition duration-200 hover:border-[#c9976f] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Download PDF
                </button>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={isActioning || !!actionSuccess}
                  className="rounded-[1rem] bg-[#8b5a3a] px-4 py-2.5 text-sm font-semibold text-white transition duration-200 hover:bg-[#73492f] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Save report
                </button>
                <button
                  type="button"
                  onClick={() => setActivePopup("critical")}
                  disabled={isActioning}
                  className="rounded-[1rem] border border-[#c9443a] px-4 py-2.5 text-sm font-semibold text-[#a03030] transition duration-200 hover:bg-[#fde8e8] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Save as critical
                </button>
                <button
                  type="button"
                  onClick={() => setActivePopup("warn")}
                  disabled={isActioning}
                  className="rounded-[1rem] border border-[#c97a3a] px-4 py-2.5 text-sm font-semibold text-[#8b5a1a] transition duration-200 hover:bg-[#fff3e0] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Request revision
                </button>
                {isSaved && (
                  <button
                    type="button"
                    onClick={() => setActivePopup("delete")}
                    disabled={isActioning}
                    className="rounded-[1rem] bg-[#a03030] px-4 py-2.5 text-sm font-semibold text-white transition duration-200 hover:bg-[#882828] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Delete report
                  </button>
                )}
              </div>
            </div>

            {report.repComments && (
              <div className="mt-5 rounded-[1.1rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a37d63]">
                  Sales rep comments
                </p>
                <p className="mt-2 text-sm leading-6 text-[#4d3020]">
                  {report.repComments}
                </p>
              </div>
            )}
          </div>

          {/* Route Summary */}
          {routeSummary && (
            <div className={surfaceClassName + " px-6 py-6 sm:px-7"}>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">
                Route Summary
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                  label="Field Duration"
                  value={`${routeSummary.fieldDurationMinutes ?? 0} min`}
                />
                <SummaryCard
                  label="Opening Stock Lines"
                  value={String(routeSummary.openingStockLines ?? 0)}
                />
                <SummaryCard
                  label="Closing Stock Lines"
                  value={String(routeSummary.closingStockLines ?? 0)}
                />
                <SummaryCard
                  label="Return Lines"
                  value={String(routeSummary.returnLineCount ?? 0)}
                />
              </div>
            </div>
          )}

          {/* Visit Summary */}
          {visitSummary && (
            <div className={surfaceClassName + " px-6 py-6 sm:px-7"}>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">
                Visit Summary
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                  label="Total Visits"
                  value={String(visitSummary.totalVisits ?? 0)}
                />
                <SummaryCard
                  label="Completed"
                  value={String(visitSummary.completedVisits ?? 0)}
                />
                <SummaryCard
                  label="Total Duration"
                  value={`${visitSummary.totalDurationMinutes ?? 0} min`}
                />
                <SummaryCard
                  label="Outlet Feedback"
                  value={String(visitSummary.feedbackCount ?? 0)}
                />
              </div>
            </div>
          )}

          {/* OSA Summary */}
          {osaSummary && (
            <div className={surfaceClassName + " px-6 py-6 sm:px-7"}>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">
                OSA Summary
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                  label="Planogram OK"
                  value={String(osaSummary.visitsWithPlanogramOk ?? 0)}
                />
                <SummaryCard
                  label="POSM OK"
                  value={String(osaSummary.visitsWithPosmOk ?? 0)}
                />
                <SummaryCard
                  label="OSA Issues"
                  value={String(osaSummary.issueCount ?? 0)}
                />
                <SummaryCard
                  label="Outlets with Issues"
                  value={String(osaSummary.outletCountWithIssues ?? 0)}
                />
              </div>
              {Array.isArray(osaSummary.issues) &&
                (osaSummary.issues as unknown[]).length > 0 && (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#eee2d7]">
                          <th className="pb-2 text-left text-xs font-semibold text-[#8a6c58]">
                            Outlet
                          </th>
                          <th className="pb-2 text-left text-xs font-semibold text-[#8a6c58]">
                            Issue type
                          </th>
                          <th className="pb-2 text-left text-xs font-semibold text-[#8a6c58]">
                            Note
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(osaSummary.issues as Record<string, unknown>[])
                          .slice(0, 10)
                          .map((issue, i) => (
                            <tr key={i} className="border-b border-[#f5ede6]">
                              <td className="py-2 text-[#4d3020]">
                                {String(
                                  issue.outletName ?? issue.shopName ?? "—",
                                )}
                              </td>
                              <td className="py-2 text-[#7f6657]">
                                {String(issue.issueType ?? "—")}
                              </td>
                              <td className="py-2 text-[#7f6657]">
                                {String(issue.note ?? "—")}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
            </div>
          )}

          {/* Delivery Summary */}
          {deliverySummary && (
            <div className={surfaceClassName + " px-6 py-6 sm:px-7"}>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">
                Delivery Summary
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <SummaryCard
                  label="Assisted Orders"
                  value={String(deliverySummary.assistedOrderCount ?? 0)}
                />
                <SummaryCard
                  label="Total Order Value"
                  value={`LKR ${Number(deliverySummary.totalOrderValue ?? 0).toLocaleString()}`}
                />
              </div>
            </div>
          )}

          {/* Incident Summary */}
          {incidentSummary &&
            Number(incidentSummary.incidentCount ?? 0) > 0 && (
              <div className={surfaceClassName + " px-6 py-6 sm:px-7"}>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">
                  Incidents
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <SummaryCard
                    label="Total Incidents"
                    value={String(incidentSummary.incidentCount ?? 0)}
                  />
                </div>
                {Array.isArray(incidentSummary.incidents) &&
                  (incidentSummary.incidents as unknown[]).length > 0 && (
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[#eee2d7]">
                            <th className="pb-2 text-left text-xs font-semibold text-[#8a6c58]">
                              Type
                            </th>
                            <th className="pb-2 text-left text-xs font-semibold text-[#8a6c58]">
                              Severity
                            </th>
                            <th className="pb-2 text-left text-xs font-semibold text-[#8a6c58]">
                              Description
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {(
                            incidentSummary.incidents as Record<
                              string,
                              unknown
                            >[]
                          ).map((inc, i) => (
                            <tr key={i} className="border-b border-[#f5ede6]">
                              <td className="py-2 text-[#4d3020]">
                                {String(inc.incidentType ?? inc.type ?? "—")}
                              </td>
                              <td className="py-2 text-[#7f6657]">
                                {String(inc.severity ?? "—")}
                              </td>
                              <td className="py-2 text-[#7f6657]">
                                {String(inc.description ?? "—")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
              </div>
            )}
        </div>
      </div>
    </>
  );
}

function buildFallbackEmployeeDetail(data: DailyReportDetail): EmployeeDetail {
  const { report } = data;
  const incidentSummary = report.incidentSummaryJson as Record<
    string,
    unknown
  > | null;
  const routeSummary = report.routeSummaryJson as Record<
    string,
    unknown
  > | null;
  const fallbackIncidents = Array.isArray(incidentSummary?.incidents)
    ? (incidentSummary?.incidents as Record<string, unknown>[]).map(
        (incident, index) => ({
          id: String(
            incident.incidentId ?? incident.id ?? `incident-${index + 1}`,
          ),
          incidentType: String(
            incident.incidentType ?? incident.type ?? "INCIDENT",
          ),
          severity: String(incident.severity ?? "LOW"),
          description: String(incident.description ?? ""),
          outletId: incident.shopId == null ? null : String(incident.shopId),
          time: String(incident.time ?? incident.createdAt ?? ""),
        }),
      )
    : [];

  return {
    userId: report.salesRep.id,
    userName: `${report.salesRep.firstName} ${report.salesRep.lastName}`.trim(),
    role: null,
    territory: report.route?.territory?.name ?? null,
    territoryId: null,
    route: {
      id: String(routeSummary?.routeId ?? ""),
      status: String(routeSummary?.status ?? "SUBMITTED"),
      startedAt:
        routeSummary?.startedAt == null ? null : String(routeSummary.startedAt),
      closedAt:
        routeSummary?.closedAt == null ? null : String(routeSummary.closedAt),
    },
    routeTimeline: [],
    skipLog: [],
    incidents: fallbackIncidents,
    dailyReport: {
      id: report.id,
      status: "SUBMITTED",
      reportDate: report.reportDate,
      submittedAt: report.submittedAt,
      repComments: report.repComments,
      routeSummary: report.routeSummaryJson,
      visitSummary: report.visitSummaryJson,
      osaSummary: report.osaSummaryJson,
      deliverySummary: report.deliverySummaryJson,
      returnSummary: report.returnSummaryJson,
      incidentSummary: report.incidentSummaryJson,
    },
  };
}
