import { type EmployeeDetail } from "../api/fieldMonitoring";
import { type DailyReportDetail } from "../api/reportDashboard";
import { createDailyReportPdf } from "./dailyReportPdf";

export function buildFallbackEmployeeDetail(
  data: DailyReportDetail,
): EmployeeDetail {
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
    ? (incidentSummary.incidents as Record<string, unknown>[]).map(
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

export function openDailyReportPdf(detail: EmployeeDetail) {
  const pdf = createDailyReportPdf(detail);
  const url = URL.createObjectURL(pdf);
  window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function downloadDailyReportPdf(detail: EmployeeDetail) {
  const pdf = createDailyReportPdf(detail);
  const url = URL.createObjectURL(pdf);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${detail.userName.replace(/\s+/g, "-").toLowerCase()}-${detail.dailyReport?.reportDate ?? "daily-report"}-daily-report.pdf`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
