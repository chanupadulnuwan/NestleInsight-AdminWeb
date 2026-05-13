import type {
  DailyReportSummary,
  EmployeeDetail,
  IncidentEntry,
  RouteStop,
  SkipLogEntry,
} from "../api/fieldMonitoring";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const PAGE_MARGIN_X = 42;
const PAGE_TOP = 800;
const PAGE_BOTTOM = 42;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN_X * 2;

const COLORS = {
  ink: [0.22, 0.13, 0.08] as const,
  muted: [0.52, 0.41, 0.35] as const,
  border: [0.9, 0.85, 0.8] as const,
  panel: [0.99, 0.97, 0.95] as const,
  surface: [1, 1, 1] as const,
  accent: [0.55, 0.35, 0.23] as const,
  accentSoft: [0.97, 0.93, 0.89] as const,
} satisfies Record<string, readonly [number, number, number]>;

type PdfColor = readonly [number, number, number];

type TextOptions = {
  font?: "regular" | "bold";
  size?: number;
  color?: PdfColor;
};

type MetricItem = {
  label: string;
  value: string;
};

type NoteBlock = {
  label: string;
  text: string;
};

type RecordGroup = {
  title: string;
  items: Array<Record<string, unknown>>;
  emptyMessage?: string;
};

type ReportCard = {
  title: string;
  subtitle?: string;
  entries?: Array<[string, unknown]>;
  notes?: NoteBlock[];
  groups?: RecordGroup[];
};

type RenderLine = {
  text: string;
  font: "regular" | "bold";
  size: number;
  color: PdfColor;
  gapBefore: number;
};

class PdfPage {
  commands: string[] = [];

  text(x: number, y: number, value: string, options: TextOptions = {}) {
    const font = options.font === "bold" ? "F2" : "F1";
    const size = options.size ?? 10;
    const color = options.color ?? COLORS.ink;

    this.commands.push(
      "BT",
      `${color[0]} ${color[1]} ${color[2]} rg`,
      `/${font} ${size} Tf`,
      `1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm`,
      `(${escapePdfText(value)}) Tj`,
      "ET",
    );
  }

  filledRect(
    x: number,
    y: number,
    width: number,
    height: number,
    fill: PdfColor,
  ) {
    this.commands.push(
      `${fill[0]} ${fill[1]} ${fill[2]} rg`,
      `${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f`,
    );
  }

  strokedRect(
    x: number,
    y: number,
    width: number,
    height: number,
    stroke: PdfColor,
    lineWidth = 1,
  ) {
    this.commands.push(
      `${lineWidth.toFixed(2)} w`,
      `${stroke[0]} ${stroke[1]} ${stroke[2]} RG`,
      `${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re S`,
    );
  }

  line(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    stroke: PdfColor,
    lineWidth = 1,
  ) {
    this.commands.push(
      `${lineWidth.toFixed(2)} w`,
      `${stroke[0]} ${stroke[1]} ${stroke[2]} RG`,
      `${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`,
    );
  }

  toStream() {
    return this.commands.join("\n");
  }
}

class PdfLayout {
  private readonly pages: PdfPage[] = [];
  private page!: PdfPage;
  private cursorY = PAGE_TOP;

  constructor() {
    this.startNewPage();
  }

  private startNewPage() {
    this.page = new PdfPage();
    this.pages.push(this.page);
    this.cursorY = PAGE_TOP;
  }

  private ensureSpace(height: number) {
    if (this.cursorY - height < PAGE_BOTTOM) {
      this.startNewPage();
    }
  }

  addGap(height: number) {
    this.cursorY -= height;
  }

  drawHeader(detail: EmployeeDetail, report: DailyReportSummary) {
    const headerHeight = 96;
    this.ensureSpace(headerHeight);

    const y = this.cursorY - headerHeight;
    this.page.filledRect(0, y, PAGE_WIDTH, headerHeight, COLORS.accent);
    this.page.text(PAGE_MARGIN_X, this.cursorY - 30, "Nestle Insight", {
      font: "bold",
      size: 20,
      color: COLORS.surface,
    });
    this.page.text(
      PAGE_MARGIN_X,
      this.cursorY - 50,
      "Sales Representative Field Report",
      {
        font: "bold",
        size: 13,
        color: COLORS.surface,
      },
    );
    this.page.text(
      PAGE_MARGIN_X,
      this.cursorY - 68,
      `${detail.userName} | ${report.reportDate}`,
      {
        size: 10,
        color: COLORS.surface,
      },
    );
    this.page.text(
      PAGE_WIDTH - 160,
      this.cursorY - 32,
      `Status: ${report.status}`,
      {
        font: "bold",
        size: 11,
        color: COLORS.surface,
      },
    );
    this.page.text(
      PAGE_WIDTH - 160,
      this.cursorY - 50,
      `Territory: ${detail.territory ?? "N/A"}`,
      {
        size: 9,
        color: COLORS.surface,
      },
    );
    this.page.text(
      PAGE_WIDTH - 160,
      this.cursorY - 66,
      `Submitted: ${displayForPdf(report.submittedAt)}`,
      {
        size: 9,
        color: COLORS.surface,
      },
    );

    this.cursorY = y - 18;
  }

  drawSectionTitle(title: string, subtitle?: string) {
    const estimatedHeight = subtitle ? 34 : 22;
    this.ensureSpace(estimatedHeight);
    this.page.text(PAGE_MARGIN_X, this.cursorY, title, {
      font: "bold",
      size: 13,
      color: COLORS.accent,
    });

    if (subtitle) {
      wrapText(subtitle, 88).forEach((line, index) => {
        this.page.text(PAGE_MARGIN_X, this.cursorY - 14 - index * 10, line, {
          size: 9,
          color: COLORS.muted,
        });
      });
    }

    const lineY = this.cursorY - (subtitle ? 22 : 8);
    this.page.line(
      PAGE_MARGIN_X,
      lineY,
      PAGE_MARGIN_X + CONTENT_WIDTH,
      lineY,
      COLORS.border,
    );
    this.cursorY = lineY - 14;
  }

  drawMetricGrid(items: MetricItem[]) {
    if (items.length === 0) {
      return;
    }

    const columnGap = 12;
    const columnWidth = (CONTENT_WIDTH - columnGap) / 2;
    const rowHeight = 46;

    items.forEach((item, index) => {
      const column = index % 2;
      if (column === 0) {
        this.ensureSpace(rowHeight + 8);
      }

      const row = Math.floor(index / 2);
      const topY = this.cursorY - row * (rowHeight + 8);
      const y = topY - rowHeight;
      const x = PAGE_MARGIN_X + column * (columnWidth + columnGap);

      this.page.filledRect(x, y, columnWidth, rowHeight, COLORS.surface);
      this.page.strokedRect(x, y, columnWidth, rowHeight, COLORS.border);
      this.page.text(x + 12, topY - 14, item.label, {
        font: "bold",
        size: 8,
        color: COLORS.muted,
      });

      wrapText(item.value, 28)
        .slice(0, 2)
        .forEach((line, lineIndex) => {
          this.page.text(x + 12, topY - 28 - lineIndex * 11, line, {
            size: 10,
            color: COLORS.ink,
          });
        });
    });

    const totalRows = Math.ceil(items.length / 2);
    this.cursorY -= totalRows * (rowHeight + 8);
  }

  drawInfoBox(
    title: string,
    text: string,
    fill: PdfColor = COLORS.accentSoft,
    titleColor: PdfColor = COLORS.accent,
  ) {
    const wrapped = wrapText(text, 88);
    const height = 42 + wrapped.length * 12;
    this.ensureSpace(height);
    const y = this.cursorY - height;

    this.page.filledRect(PAGE_MARGIN_X, y, CONTENT_WIDTH, height, fill);
    this.page.strokedRect(
      PAGE_MARGIN_X,
      y,
      CONTENT_WIDTH,
      height,
      COLORS.border,
    );
    this.page.text(PAGE_MARGIN_X + 14, this.cursorY - 18, title, {
      font: "bold",
      size: 10,
      color: titleColor,
    });

    wrapped.forEach((line, index) => {
      this.page.text(PAGE_MARGIN_X + 14, this.cursorY - 34 - index * 12, line, {
        size: 10,
        color: COLORS.ink,
      });
    });

    this.cursorY = y - 16;
  }

  drawRecordCards(cards: ReportCard[], emptyMessage: string) {
    if (cards.length === 0) {
      this.drawMutedNote(emptyMessage);
      return;
    }

    cards.forEach((card, index) => {
      this.drawRecordCard(card, index);
    });
  }

  private drawMutedNote(message: string) {
    const wrapped = wrapText(message, 88);
    const height = 24 + wrapped.length * 11;
    this.ensureSpace(height);
    const y = this.cursorY - height;

    this.page.filledRect(PAGE_MARGIN_X, y, CONTENT_WIDTH, height, COLORS.panel);
    this.page.strokedRect(
      PAGE_MARGIN_X,
      y,
      CONTENT_WIDTH,
      height,
      COLORS.border,
    );
    wrapped.forEach((line, index) => {
      this.page.text(PAGE_MARGIN_X + 14, this.cursorY - 16 - index * 11, line, {
        size: 9,
        color: COLORS.muted,
      });
    });

    this.cursorY = y - 12;
  }

  private drawRecordCard(card: ReportCard, index: number) {
    const lines = buildCardLines(card);
    const bodyHeight = lines.reduce(
      (sum, line) => sum + line.gapBefore + lineAdvance(line),
      0,
    );
    const cardHeight = 18 + bodyHeight + 10;

    this.ensureSpace(cardHeight + 8);

    const y = this.cursorY - cardHeight;
    this.page.filledRect(
      PAGE_MARGIN_X,
      y,
      CONTENT_WIDTH,
      cardHeight,
      index % 2 === 0 ? COLORS.surface : COLORS.panel,
    );
    this.page.strokedRect(
      PAGE_MARGIN_X,
      y,
      CONTENT_WIDTH,
      cardHeight,
      COLORS.border,
    );

    let baselineY = this.cursorY - 14;
    lines.forEach((line) => {
      baselineY -= line.gapBefore;
      this.page.text(PAGE_MARGIN_X + 12, baselineY, line.text, {
        font: line.font,
        size: line.size,
        color: line.color,
      });
      baselineY -= lineAdvance(line);
    });

    this.cursorY = y - 10;
  }

  getPages() {
    return this.pages;
  }
}

export function createDailyReportPdf(detail: EmployeeDetail) {
  const report = detail.dailyReport;
  if (!report) {
    throw new Error("Daily report is required to generate the PDF.");
  }

  const routeSummary = asRecord(report.routeSummary);
  const visitSummary = asRecord(report.visitSummary);
  const osaSummary = asRecord(report.osaSummary);
  const deliverySummary = asRecord(report.deliverySummary);
  const returnSummary = asRecord(report.returnSummary);
  const incidentSummary = asRecord(report.incidentSummary);

  const layout = new PdfLayout();
  layout.drawHeader(detail, report);
  layout.drawMetricGrid(buildOverviewMetrics(detail, report));
  layout.addGap(8);
  layout.drawInfoBox(
    "Operational Summary",
    buildOperationalSummary(detail, report),
    COLORS.panel,
    COLORS.accent,
  );

  if (report.repComments?.trim()) {
    layout.drawInfoBox(
      "Sales Rep Comments",
      report.repComments.trim(),
      COLORS.accentSoft,
      COLORS.accent,
    );
  }

  layout.drawSectionTitle(
    "Route And Visit Overview",
    "Core route, visit, OSA, order, return, and incident metrics collected through the mobile workflow.",
  );
  layout.drawMetricGrid(
    buildRouteVisitMetrics(detail, routeSummary, visitSummary),
  );
  layout.addGap(4);
  layout.drawMetricGrid(
    buildExecutionMetrics(
      osaSummary,
      deliverySummary,
      returnSummary,
      incidentSummary,
    ),
  );

  layout.drawSectionTitle(
    "Route Timeline",
    "Stop-by-stop route flow including arrival, completion, skipped reasons, and photo evidence references.",
  );
  layout.drawRecordCards(
    buildRouteTimelineCards(detail.routeTimeline),
    "No route stops were recorded for this report date.",
  );

  layout.drawSectionTitle(
    "Skipped Or Unfinished Stops",
    "Dedicated view of skipped outlets and the recorded reasons.",
  );
  layout.drawRecordCards(
    buildSkipCards(detail.skipLog),
    "No skipped outlets were recorded for this route.",
  );

  layout.drawSectionTitle(
    "Outlet Visit Detail Log",
    "Per-outlet execution details including duration, backroom stock, OSA, estimated sales, promotions, planogram checks, feedback, and photo references.",
  );
  layout.drawRecordCards(
    buildOutletCards(visitSummary),
    "No completed outlet visit data was captured in the daily report.",
  );

  layout.drawSectionTitle(
    "Orders And Delivery",
    "Assisted orders captured during the route.",
  );
  layout.drawRecordCards(
    buildOrderCards(deliverySummary),
    "No assisted orders were attached to this route report.",
  );

  layout.drawSectionTitle(
    "Returns",
    "Returned products and quantities recorded during the route.",
  );
  layout.drawRecordCards(
    buildReturnCards(returnSummary),
    "No returned items were captured for this route.",
  );

  layout.drawSectionTitle(
    "Incident Log",
    "Reported incidents from the route with severity and description.",
  );
  layout.drawRecordCards(
    buildIncidentCards(incidentSummary, detail.incidents),
    "No incidents were recorded for this route.",
  );

  const pages = layout.getPages();
  const fontRegularObjectNumber = 3 + pages.length * 2;
  const fontBoldObjectNumber = fontRegularObjectNumber + 1;
  const objects: string[] = [];

  objects.push("<< /Type /Catalog /Pages 2 0 R >>");

  const pageObjectNumbers = pages.map((_, index) => 3 + index * 2);
  objects.push(
    `<< /Type /Pages /Count ${pages.length} /Kids [${pageObjectNumbers
      .map((pageNumber) => `${pageNumber} 0 R`)
      .join(" ")}] >>`,
  );

  pages.forEach((page, index) => {
    const pageObjectNumber = 3 + index * 2;
    const contentObjectNumber = pageObjectNumber + 1;
    const contentStream = page.toStream();
    const contentLength = new TextEncoder().encode(contentStream).length;

    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontRegularObjectNumber} 0 R /F2 ${fontBoldObjectNumber} 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`,
    );
    objects.push(
      `<< /Length ${contentLength} >>\nstream\n${contentStream}\nendstream`,
    );
  });

  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  objects.forEach((objectBody, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${objectBody}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  offsets.slice(1).forEach((offset) => {
    pdf += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  });

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

function buildOverviewMetrics(
  detail: EmployeeDetail,
  report: DailyReportSummary,
): MetricItem[] {
  return [
    { label: "Sales Rep", value: detail.userName },
    { label: "Role", value: detail.role ?? "N/A" },
    { label: "Territory", value: detail.territory ?? "N/A" },
    { label: "Report Date", value: report.reportDate },
    { label: "Route Status", value: detail.route?.status ?? "N/A" },
    { label: "Submitted At", value: displayForPdf(report.submittedAt) },
  ];
}

function buildRouteVisitMetrics(
  detail: EmployeeDetail,
  routeSummary: Record<string, unknown> | null,
  visitSummary: Record<string, unknown> | null,
): MetricItem[] {
  const totalStops = detail.routeTimeline.length;
  const totalVisits = readNumber(visitSummary?.totalVisits);
  const completedVisits = readNumber(visitSummary?.completedVisits);

  return [
    { label: "Route ID", value: detail.route?.id ?? "N/A" },
    {
      label: "Route Started",
      value: displayForPdf(detail.route?.startedAt ?? routeSummary?.startedAt),
    },
    {
      label: "Route Closed",
      value: displayForPdf(detail.route?.closedAt ?? routeSummary?.closedAt),
    },
    {
      label: "Route Duration",
      value: formatDurationMetric(
        routeSummary?.totalRouteDurationSeconds,
        routeSummary?.totalRouteDurationMinutes,
      ),
    },
    {
      label: "Planned Stops",
      value: totalStops > 0 ? String(totalStops) : "0",
    },
    {
      label: "Completed Visits",
      value: completedVisits > 0 ? String(completedVisits) : "0",
    },
    {
      label: "Skipped Stops",
      value: String(detail.skipLog.length),
    },
    {
      label: "Total Visits",
      value: totalVisits > 0 ? String(totalVisits) : "0",
    },
    {
      label: "Visit Duration",
      value: displayNumberMetric(
        visitSummary?.totalVisitDurationMinutes,
        " min",
      ),
    },
    {
      label: "Photo Count",
      value: displayNumberMetric(visitSummary?.photoCount),
    },
    {
      label: "Feedback Count",
      value: displayNumberMetric(visitSummary?.feedbackCount),
    },
    {
      label: "Returned Cases",
      value: displayNumberMetric(routeSummary?.totalReturnedCases),
    },
  ];
}

function buildExecutionMetrics(
  osaSummary: Record<string, unknown> | null,
  deliverySummary: Record<string, unknown> | null,
  returnSummary: Record<string, unknown> | null,
  incidentSummary: Record<string, unknown> | null,
): MetricItem[] {
  return [
    {
      label: "Planogram OK Visits",
      value: displayNumberMetric(osaSummary?.visitsWithPlanogramOk),
    },
    {
      label: "POSM OK Visits",
      value: displayNumberMetric(osaSummary?.visitsWithPosmOk),
    },
    {
      label: "OSA Issue Entries",
      value: displayNumberMetric(
        osaSummary?.totalOsaIssueEntries ?? osaSummary?.issueCount,
      ),
    },
    {
      label: "Outlets With OSA Notes",
      value: displayNumberMetric(osaSummary?.outletCountWithIssues),
    },
    {
      label: "Assisted Orders",
      value: displayNumberMetric(deliverySummary?.assistedOrderCount),
    },
    {
      label: "Total Order Value",
      value: formatFieldValue(
        "totalOrderValue",
        deliverySummary?.totalOrderValue,
      ),
    },
    {
      label: "Return Lines",
      value: displayNumberMetric(returnSummary?.returnLineCount),
    },
    {
      label: "Returned Units",
      value: displayNumberMetric(returnSummary?.totalReturnedUnits),
    },
    {
      label: "Incident Count",
      value: displayNumberMetric(incidentSummary?.incidentCount),
    },
  ];
}

function buildOperationalSummary(
  detail: EmployeeDetail,
  report: DailyReportSummary,
): string {
  const routeSummary = asRecord(report.routeSummary);
  const visitSummary = asRecord(report.visitSummary);
  const osaSummary = asRecord(report.osaSummary);
  const deliverySummary = asRecord(report.deliverySummary);
  const incidentSummary = asRecord(report.incidentSummary);

  const routeDuration = formatDurationMetric(
    routeSummary?.totalRouteDurationSeconds,
    routeSummary?.totalRouteDurationMinutes,
  );
  const completedVisits = readNumber(visitSummary?.completedVisits);
  const assistedOrders = readNumber(deliverySummary?.assistedOrderCount);
  const issueCount = readNumber(
    osaSummary?.totalOsaIssueEntries ?? osaSummary?.issueCount,
  );
  const incidentCount = readNumber(incidentSummary?.incidentCount);

  return `${detail.userName} operated in ${detail.territory ?? "the assigned territory"} on ${report.reportDate}. The route ran for ${routeDuration}, covered ${detail.routeTimeline.length} planned stops, completed ${completedVisits} outlet visits, and skipped ${detail.skipLog.length} stops. The report includes ${assistedOrders} assisted orders, ${issueCount} recorded OSA issue entries, and ${incidentCount} incidents. Detailed outlet sections below preserve the captured shelf stock, backroom stock, estimated sales, promotions, planogram checks, feedback, and skip reasons.`;
}

function buildRouteTimelineCards(stops: RouteStop[]): ReportCard[] {
  return stops.map((stop) => ({
    title: `Stop ${stop.sequence}: ${stop.outletName}`,
    subtitle: `${humanStatus(stop.status)} | ${stop.purpose}`,
    entries: [
      ["Address", stop.outletAddress],
      ["Arrived At", stop.arrivedAt],
      ["Completed At", stop.completedAt],
      ["Skipped At", stop.skippedAt],
      ["Duration Minutes", stop.durationMinutes],
      ["ETA Minutes", stop.etaMinutes],
      ["Distance Km", stop.distanceKm],
      ["Reason Code", stop.reasonCode],
      ["Photo Count", stop.photoUrls.length],
    ],
    groups: [
      {
        title: "Photo Evidence Links",
        items: stop.photoUrls.map((url, index) => ({
          label: `Photo ${index + 1}`,
          url,
        })),
        emptyMessage: "No photo links were recorded for this stop.",
      },
    ],
  }));
}

function buildSkipCards(entries: SkipLogEntry[]): ReportCard[] {
  return entries.map((entry) => ({
    title: entry.outletName,
    subtitle: "Skipped outlet",
    entries: [
      ["Reason Code", entry.reasonCode],
      ["Skipped At", entry.time],
    ],
  }));
}

function buildOutletCards(
  visitSummary: Record<string, unknown> | null,
): ReportCard[] {
  const visits = arrayEntries(visitSummary, "outlets");

  return visits.map((visit, index) => {
    const title =
      displayString(
        visit.outletName ??
          visit.shopName ??
          visit.shopId ??
          visit.outletId ??
          `Outlet ${index + 1}`,
      ) ?? `Outlet ${index + 1}`;

    const groups: RecordGroup[] = [
      {
        title: "Shelf Stock",
        items: normalizeItems(visit.shelfStock),
        emptyMessage: "No shelf stock rows were captured.",
      },
      {
        title: "Backroom Stock",
        items: normalizeItems(visit.backroomStock),
        emptyMessage: "No backroom stock rows were captured.",
      },
      {
        title: "OSA Issues",
        items: normalizeItems(visit.osaIssues),
        emptyMessage: "No OSA issues were captured.",
      },
      {
        title: "Promotions",
        items: normalizeItems(visit.promotions),
        emptyMessage: "No promotions were captured.",
      },
      {
        title: "Estimated Sales / Sell Through",
        items: normalizeItems(visit.estimatedSellThrough),
        emptyMessage: "No estimated sales rows were captured.",
      },
      {
        title: "Suggested Order",
        items: normalizeItems(visit.suggestedOrder),
        emptyMessage: "No suggested order was captured.",
      },
      {
        title: "Planogram Answers",
        items: normalizeItems(visit.planogramAnswers),
        emptyMessage: "No planogram answer rows were captured.",
      },
      {
        title: "Outlet Feedback Answers",
        items: normalizeItems(visit.outletFeedbackAnswers),
        emptyMessage: "No outlet feedback answer rows were captured.",
      },
      {
        title: "Expiry Items",
        items: normalizeItems(visit.expiryItems),
        emptyMessage: "No expiry item rows were captured.",
      },
      {
        title: "Photo Evidence Links",
        items: stringListToRecords(visit.photoUrls, "url"),
        emptyMessage: "No photo links were captured for this outlet.",
      },
    ];

    const notes: NoteBlock[] = [];
    const outletFeedback = displayString(visit.outletFeedback);
    const competitorNotes = displayString(visit.competitorNotes);

    if (outletFeedback) {
      notes.push({
        label: "Outlet Feedback",
        text: outletFeedback,
      });
    }

    if (competitorNotes) {
      notes.push({
        label: "Competitor Notes",
        text: competitorNotes,
      });
    }

    return {
      title,
      subtitle: `${humanStatus(displayString(visit.status) ?? "unknown")} | ${formatVisitDuration(visit)}`,
      entries: [
        ["Visit Started", visit.startedAt ?? visit.visitStartedAt],
        ["Visit Ended", visit.endedAt ?? visit.visitEndedAt],
        ["Duration Minutes", visit.durationMinutes],
        ["Pending Delivery", visit.hasPendingDelivery],
        ["Planogram OK", visit.planogramOk],
        ["POSM OK", visit.posmOk],
        ["Last Order Date", visit.lastOrderDate],
        ["Photo Count", visit.photoCount],
      ],
      notes,
      groups,
    };
  });
}

function buildOrderCards(
  deliverySummary: Record<string, unknown> | null,
): ReportCard[] {
  return arrayEntries(deliverySummary, "orders").map((order, index) => ({
    title: displayString(order.orderCode) ?? `Order ${index + 1}`,
    subtitle: "Assisted order",
    entries: Object.entries(order),
  }));
}

function buildReturnCards(
  returnSummary: Record<string, unknown> | null,
): ReportCard[] {
  return arrayEntries(returnSummary, "items").map((item, index) => ({
    title: displayString(item.productName) ?? `Return Item ${index + 1}`,
    subtitle: "Returned item",
    entries: Object.entries(item),
  }));
}

function buildIncidentCards(
  incidentSummary: Record<string, unknown> | null,
  fallbackIncidents: IncidentEntry[],
): ReportCard[] {
  const reportIncidents = arrayEntries(incidentSummary, "incidents");

  if (reportIncidents.length > 0) {
    return reportIncidents.map((incident, index) => ({
      title: displayString(incident.incidentType) ?? `Incident ${index + 1}`,
      subtitle: displayString(incident.severity) ?? "Reported incident",
      entries: Object.entries(incident),
    }));
  }

  return fallbackIncidents.map((incident, index) => ({
    title: incident.incidentType || `Incident ${index + 1}`,
    subtitle: incident.severity,
    entries: [
      ["Outlet Id", incident.outletId],
      ["Time", incident.time],
      ["Description", incident.description],
    ],
  }));
}

function buildCardLines(card: ReportCard): RenderLine[] {
  const lines: RenderLine[] = [];

  pushWrappedLines(lines, card.title, {
    font: "bold",
    size: 11,
    color: COLORS.accent,
    maxChars: 58,
    gapBefore: 0,
  });

  if (card.subtitle) {
    pushWrappedLines(lines, card.subtitle, {
      font: "regular",
      size: 9,
      color: COLORS.muted,
      maxChars: 86,
      gapBefore: 2,
    });
  }

  (card.entries ?? [])
    .filter(
      ([, value]) => value !== null && value !== undefined && value !== "",
    )
    .forEach(([label, value], index) => {
      pushWrappedLines(
        lines,
        `${labelize(label)}: ${formatFieldValue(label, value)}`,
        {
          font: "regular",
          size: 9,
          color: COLORS.ink,
          maxChars: 88,
          gapBefore: index === 0 ? 4 : 1,
        },
      );
    });
  (card.notes ?? []).forEach((note) => {
    pushWrappedLines(lines, note.label, {
      font: "bold",
      size: 9,
      color: COLORS.muted,
      maxChars: 88,
      gapBefore: 5,
    });
    pushWrappedLines(lines, note.text, {
      font: "regular",
      size: 9,
      color: COLORS.ink,
      maxChars: 88,
      gapBefore: 1,
    });
  });
  (card.groups ?? []).forEach((group) => {
    pushWrappedLines(lines, group.title, {
      font: "bold",
      size: 8,
      color: COLORS.muted,
      maxChars: 88,
      gapBefore: 6,
    });

    if (group.items.length === 0) {
      pushWrappedLines(lines, group.emptyMessage ?? "No data captured.", {
        font: "regular",
        size: 8,
        color: COLORS.muted,
        maxChars: 88,
        gapBefore: 1,
      });
      return;
    }

    group.items.forEach((item, index) => {
      pushWrappedLines(lines, itemHeading(item, index), {
        font: "bold",
        size: 8,
        color: COLORS.accent,
        maxChars: 86,
        gapBefore: 2,
      });
      compactRecordLines(item).forEach((line, lineIndex) => {
        pushWrappedLines(lines, line, {
          font: "regular",
          size: 8,
          color: COLORS.ink,
          maxChars: 90,
          gapBefore: lineIndex === 0 ? 1 : 0,
        });
      });
    });
  });

  return lines;
}

function pushWrappedLines(
  lines: RenderLine[],
  text: string,
  options: {
    font: "regular" | "bold";
    size: number;
    color: PdfColor;
    maxChars: number;
    gapBefore: number;
  },
) {
  wrapText(text, options.maxChars).forEach((line, index) => {
    lines.push({
      text: line,
      font: options.font,
      size: options.size,
      color: options.color,
      gapBefore: index === 0 ? options.gapBefore : 0,
    });
  });
}

function lineAdvance(line: RenderLine) {
  if (line.size >= 11) {
    return 13;
  }
  if (line.size >= 9) {
    return 11;
  }
  return 9.5;
}

function compactRecordLines(item: Record<string, unknown>) {
  const pairs = Object.entries(item).filter(
    ([, value]) => value != null && value !== "",
  );

  if (pairs.length === 0) {
    return ["No details captured."];
  }

  const parts = pairs.map(
    ([key, value]) => `${labelize(key)}: ${formatFieldValue(key, value)}`,
  );
  const lines: string[] = [];
  let currentLine = "";

  parts.forEach((part) => {
    const candidate = currentLine ? `${currentLine} | ${part}` : part;
    if (candidate.length <= 92) {
      currentLine = candidate;
      return;
    }

    if (currentLine) {
      lines.push(currentLine);
    }
    currentLine = part;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function itemHeading(item: Record<string, unknown>, index: number) {
  const candidates = [
    item.outletName,
    item.shopName,
    item.productName,
    item.orderCode,
    item.incidentType,
    item.issueType,
    item.label,
    item.title,
    item.name,
    item.reason,
  ];

  const heading = candidates.find((value) => displayString(value));
  return displayString(heading) ?? `Item ${index + 1}`;
}

function normalizeItems(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter(isRecord).map((item) => ({ ...item }));
  }

  if (isRecord(value)) {
    return [value];
  }

  return [];
}

function stringListToRecords(value: unknown, keyName: string) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => displayString(entry))
    .filter((entry): entry is string => Boolean(entry))
    .map((entry) => ({ [keyName]: entry }));
}

function asRecord(value: unknown) {
  return isRecord(value) ? value : null;
}

function arrayEntries(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRecord);
}

function displayForPdf(value: unknown): string {
  if (value == null || value === "") {
    return "N/A";
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (typeof value === "string" && looksLikeIsoDate(value)) {
    return formatDateTime(value);
  }
  if (typeof value === "number") {
    return Number.isInteger(value) ? `${value}` : value.toFixed(2);
  }
  if (Array.isArray(value)) {
    return value.length === 0 ? "None" : `${value.length} item(s)`;
  }
  if (isRecord(value)) {
    return Object.entries(value)
      .slice(0, 3)
      .map(([key, child]) => `${labelize(key)}: ${displayForPdf(child)}`)
      .join(" | ");
  }
  return String(value);
}

function formatFieldValue(key: string, value: unknown): string {
  const normalizedKey = key.toLowerCase();

  if (value == null || value === "") {
    return "N/A";
  }

  if (typeof value === "number") {
    if (
      normalizedKey.includes("amount") ||
      normalizedKey.includes("value") ||
      normalizedKey.includes("price") ||
      normalizedKey.includes("sales")
    ) {
      return `LKR ${value.toLocaleString("en-US")}`;
    }

    if (
      normalizedKey.includes("duration") &&
      normalizedKey.includes("second")
    ) {
      return formatDurationFromSeconds(value);
    }

    if (
      normalizedKey.includes("duration") &&
      normalizedKey.includes("minute")
    ) {
      return formatDurationFromMinutes(value);
    }

    if (normalizedKey.includes("distance") && normalizedKey.includes("km")) {
      return `${value} km`;
    }

    return Number.isInteger(value) ? `${value}` : value.toFixed(2);
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "string" && looksLikeIsoDate(value)) {
    return formatDateTime(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "None";
    }
    return value
      .map((entry) => displayForPdf(entry))
      .slice(0, 3)
      .join(", ");
  }

  if (isRecord(value)) {
    return Object.entries(value)
      .map(
        ([childKey, childValue]) =>
          `${labelize(childKey)}: ${displayForPdf(childValue)}`,
      )
      .join(" | ");
  }

  return String(value);
}

function displayString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function formatDurationMetric(secondsValue: unknown, minutesValue: unknown) {
  const seconds = readNumber(secondsValue);
  if (seconds > 0) {
    return formatDurationFromSeconds(seconds);
  }

  const minutes = readNumber(minutesValue);
  if (minutes > 0) {
    return formatDurationFromMinutes(minutes);
  }

  return "N/A";
}

function formatDurationFromSeconds(totalSeconds: number) {
  return formatDurationFromMinutes(Math.round(totalSeconds / 60));
}

function formatDurationFromMinutes(totalMinutes: number) {
  if (totalMinutes <= 0) {
    return "0 min";
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) {
    return `${minutes} min`;
  }
  if (minutes === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${minutes} min`;
}

function formatVisitDuration(visit: Record<string, unknown>) {
  const minutes = readNumber(visit.durationMinutes);
  if (minutes > 0) {
    return formatDurationFromMinutes(minutes);
  }

  const seconds = readNumber(visit.durationSeconds);
  if (seconds > 0) {
    return formatDurationFromSeconds(seconds);
  }

  return "Duration not recorded";
}

function humanStatus(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function displayNumberMetric(value: unknown, suffix = "") {
  const number = readNumber(value);
  return `${number}${suffix}`;
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  }
  return 0;
}

function wrapText(value: string, maxChars: number) {
  if (value.length <= maxChars) {
    return [value];
  }

  const words = value.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (candidate.length <= maxChars) {
      currentLine = candidate;
      return;
    }

    if (currentLine) {
      lines.push(currentLine);
    }
    currentLine = word;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function escapePdfText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

function looksLikeIsoDate(value: string) {
  return /\d{4}-\d{2}-\d{2}T/.test(value) || /\d{4}-\d{2}-\d{2}$/.test(value);
}

function labelize(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}
