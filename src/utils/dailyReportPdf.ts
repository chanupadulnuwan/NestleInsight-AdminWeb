import type { DailyReportSummary, EmployeeDetail } from '../api/fieldMonitoring'

const PAGE_WIDTH = 595
const PAGE_HEIGHT = 842
const PAGE_MARGIN_X = 42
const PAGE_TOP = 800
const PAGE_BOTTOM = 42
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN_X * 2

const COLORS = {
  ink: [0.22, 0.13, 0.08] as const,
  muted: [0.52, 0.41, 0.35] as const,
  border: [0.9, 0.85, 0.8] as const,
  panel: [0.99, 0.97, 0.95] as const,
  surface: [1, 1, 1] as const,
  accent: [0.55, 0.35, 0.23] as const,
  accentSoft: [0.97, 0.93, 0.89] as const,
  success: [0.14, 0.45, 0.27] as const,
  successSoft: [0.91, 0.97, 0.93] as const,
} satisfies Record<string, readonly [number, number, number]>

type PdfSection = {
  title: string
  scalarEntries: Array<[string, unknown]>
  groupedEntries: Array<{ title: string; entries: Array<[string, unknown]> }>
  tableGroups: Array<{ title: string; items: Array<Record<string, unknown>> }>
}

type TextOptions = {
  font?: 'regular' | 'bold'
  size?: number
  color?: readonly [number, number, number]
}

class PdfPage {
  commands: string[] = []

  text(
    x: number,
    y: number,
    value: string,
    options: TextOptions = {},
  ) {
    const font = options.font === 'bold' ? 'F2' : 'F1'
    const size = options.size ?? 10
    const color = options.color ?? COLORS.ink

    this.commands.push(
      `BT`,
      `${color[0]} ${color[1]} ${color[2]} rg`,
      `/${font} ${size} Tf`,
      `1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm`,
      `(${escapePdfText(value)}) Tj`,
      `ET`,
    )
  }

  filledRect(
    x: number,
    y: number,
    width: number,
    height: number,
    fill: readonly [number, number, number],
  ) {
    this.commands.push(
      `${fill[0]} ${fill[1]} ${fill[2]} rg`,
      `${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f`,
    )
  }

  strokedRect(
    x: number,
    y: number,
    width: number,
    height: number,
    stroke: readonly [number, number, number],
    lineWidth = 1,
  ) {
    this.commands.push(
      `${lineWidth.toFixed(2)} w`,
      `${stroke[0]} ${stroke[1]} ${stroke[2]} RG`,
      `${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re S`,
    )
  }

  line(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    stroke: readonly [number, number, number],
    lineWidth = 1,
  ) {
    this.commands.push(
      `${lineWidth.toFixed(2)} w`,
      `${stroke[0]} ${stroke[1]} ${stroke[2]} RG`,
      `${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`,
    )
  }

  toStream() {
    return this.commands.join('\n')
  }
}

class PdfLayout {
  private readonly pages: PdfPage[] = []
  private page!: PdfPage
  private cursorY = PAGE_TOP

  constructor() {
    this.startNewPage()
  }

  private startNewPage() {
    this.page = new PdfPage()
    this.pages.push(this.page)
    this.cursorY = PAGE_TOP
  }

  private ensureSpace(height: number) {
    if (this.cursorY - height < PAGE_BOTTOM) {
      this.startNewPage()
    }
  }

  addGap(height: number) {
    this.cursorY -= height
  }

  drawHeader(
    employee: Pick<EmployeeDetail, 'userName' | 'role' | 'territory'>,
    report: DailyReportSummary,
  ) {
    const headerHeight = 94
    this.ensureSpace(headerHeight)

    const y = this.cursorY - headerHeight
    this.page.filledRect(0, y, PAGE_WIDTH, headerHeight, COLORS.accent)
    this.page.text(PAGE_MARGIN_X, this.cursorY - 30, 'Nestle Insight', {
      font: 'bold',
      size: 20,
      color: COLORS.surface,
    })
    this.page.text(PAGE_MARGIN_X, this.cursorY - 50, 'Sales Representative Daily Report', {
      font: 'bold',
      size: 13,
      color: COLORS.surface,
    })
    this.page.text(PAGE_MARGIN_X, this.cursorY - 68, `${employee.userName} · ${report.reportDate}`, {
      size: 10,
      color: COLORS.surface,
    })
    this.page.text(PAGE_WIDTH - 160, this.cursorY - 32, `Status: ${report.status}`, {
      font: 'bold',
      size: 11,
      color: COLORS.surface,
    })
    this.page.text(
      PAGE_WIDTH - 160,
      this.cursorY - 50,
      `Submitted: ${displayForPdf(report.submittedAt)}`,
      {
        size: 9,
        color: COLORS.surface,
      },
    )

    this.cursorY = y - 18
  }

  drawMetaPanel(
    employee: Pick<EmployeeDetail, 'userName' | 'role' | 'territory'>,
    report: DailyReportSummary,
  ) {
    const rows = [
      ['Sales Rep', employee.userName],
      ['Role', employee.role ?? 'N/A'],
      ['Territory', employee.territory ?? 'N/A'],
      ['Report Date', report.reportDate],
      ['Report ID', report.id],
      ['Submitted At', displayForPdf(report.submittedAt)],
    ]

    const panelHeight = 98
    this.ensureSpace(panelHeight)
    const y = this.cursorY - panelHeight
    this.page.filledRect(PAGE_MARGIN_X, y, CONTENT_WIDTH, panelHeight, COLORS.panel)
    this.page.strokedRect(PAGE_MARGIN_X, y, CONTENT_WIDTH, panelHeight, COLORS.border)

    const columnWidth = CONTENT_WIDTH / 2
    rows.forEach(([label, value], index) => {
      const column = index % 2
      const row = Math.floor(index / 2)
      const baseX = PAGE_MARGIN_X + 16 + column * columnWidth
      const baseY = this.cursorY - 22 - row * 28

      this.page.text(baseX, baseY, label, {
        font: 'bold',
        size: 8,
        color: COLORS.muted,
      })
      this.page.text(baseX, baseY - 12, displayForPdf(value), {
        size: 10,
        color: COLORS.ink,
      })
    })

    this.cursorY = y - 18
  }

  drawComments(comments: string | null) {
    const trimmed = comments?.trim()
    if (!trimmed) {
      return
    }

    const wrapped = wrapText(trimmed, 88)
    const height = 44 + wrapped.length * 12
    this.ensureSpace(height)
    const y = this.cursorY - height

    this.page.filledRect(PAGE_MARGIN_X, y, CONTENT_WIDTH, height, COLORS.accentSoft)
    this.page.strokedRect(PAGE_MARGIN_X, y, CONTENT_WIDTH, height, COLORS.border)
    this.page.text(PAGE_MARGIN_X + 14, this.cursorY - 20, 'Representative Comments', {
      font: 'bold',
      size: 10,
      color: COLORS.accent,
    })

    wrapped.forEach((line, index) => {
      this.page.text(PAGE_MARGIN_X + 14, this.cursorY - 38 - index * 12, line, {
        size: 10,
        color: COLORS.ink,
      })
    })

    this.cursorY = y - 18
  }

  drawSection(section: PdfSection) {
    const minHeight = 52
    this.ensureSpace(minHeight)

    this.page.text(PAGE_MARGIN_X, this.cursorY, section.title, {
      font: 'bold',
      size: 13,
      color: COLORS.accent,
    })
    this.page.line(PAGE_MARGIN_X, this.cursorY - 8, PAGE_MARGIN_X + CONTENT_WIDTH, this.cursorY - 8, COLORS.border)
    this.cursorY -= 24

    if (
      section.scalarEntries.length === 0 &&
      section.groupedEntries.length === 0 &&
      section.tableGroups.every((group) => group.items.length === 0)
    ) {
      this.drawMutedNote('No data available for this section.')
      return
    }

    if (section.scalarEntries.length > 0) {
      this.drawSummaryCards(section.scalarEntries)
      this.addGap(8)
    }

    section.groupedEntries.forEach((group) => {
      if (group.entries.length === 0) {
        return
      }
      this.drawGroupedCounts(group.title, group.entries)
      this.addGap(10)
    })

    section.tableGroups.forEach((group) => {
      if (group.items.length === 0) {
        return
      }
      this.drawItemCards(group.title, group.items)
      this.addGap(12)
    })
  }

  private drawMutedNote(message: string) {
    const height = 34
    this.ensureSpace(height)
    const y = this.cursorY - height
    this.page.filledRect(PAGE_MARGIN_X, y, CONTENT_WIDTH, height, COLORS.panel)
    this.page.strokedRect(PAGE_MARGIN_X, y, CONTENT_WIDTH, height, COLORS.border)
    this.page.text(PAGE_MARGIN_X + 14, this.cursorY - 20, message, {
      size: 10,
      color: COLORS.muted,
    })
    this.cursorY = y - 14
  }

  private drawSummaryCards(entries: Array<[string, unknown]>) {
    const columnGap = 12
    const columnWidth = (CONTENT_WIDTH - columnGap) / 2
    const rowHeight = 44

    entries.forEach(([label, value], index) => {
      const column = index % 2
      const isRowStart = column === 0
      if (isRowStart) {
        this.ensureSpace(rowHeight + 6)
      }

      const row = Math.floor(index / 2)
      const topY = this.cursorY - row * (rowHeight + 8)
      const y = topY - rowHeight
      const x = PAGE_MARGIN_X + column * (columnWidth + columnGap)

      this.page.filledRect(x, y, columnWidth, rowHeight, COLORS.surface)
      this.page.strokedRect(x, y, columnWidth, rowHeight, COLORS.border)
      this.page.text(x + 12, topY - 16, labelize(label), {
        font: 'bold',
        size: 8,
        color: COLORS.muted,
      })
      const valueLines = wrapText(displayForPdf(value), 28).slice(0, 2)
      valueLines.forEach((line, lineIndex) => {
        this.page.text(x + 12, topY - 30 - lineIndex * 11, line, {
          size: 10,
          color: COLORS.ink,
        })
      })
    })

    const totalRows = Math.ceil(entries.length / 2)
    this.cursorY -= totalRows * (rowHeight + 8)
  }

  private drawGroupedCounts(title: string, entries: Array<[string, unknown]>) {
    const titleHeight = 12
    this.ensureSpace(titleHeight + 30)
    this.page.text(PAGE_MARGIN_X, this.cursorY, title, {
      font: 'bold',
      size: 9,
      color: COLORS.muted,
    })
    this.cursorY -= 16

    entries.forEach(([label, value]) => {
      const lineHeight = 24
      this.ensureSpace(lineHeight)
      const y = this.cursorY - lineHeight
      this.page.filledRect(PAGE_MARGIN_X, y, CONTENT_WIDTH, lineHeight, COLORS.panel)
      this.page.strokedRect(PAGE_MARGIN_X, y, CONTENT_WIDTH, lineHeight, COLORS.border)
      this.page.text(PAGE_MARGIN_X + 12, this.cursorY - 15, `${labelize(label)}: ${displayForPdf(value)}`, {
        size: 9,
        color: COLORS.ink,
      })
      this.cursorY = y - 6
    })
  }

  private drawItemCards(title: string, items: Array<Record<string, unknown>>) {
    this.ensureSpace(20)
    this.page.text(PAGE_MARGIN_X, this.cursorY, title, {
      font: 'bold',
      size: 9,
      color: COLORS.muted,
    })
    this.cursorY -= 14

    items.forEach((item, index) => {
      const lines: string[] = []
      Object.entries(item).forEach(([key, value]) => {
        lines.push(`${labelize(key)}: ${displayForPdf(value)}`)
      })

      const wrappedLines = lines.flatMap((line) => wrapText(line, 84))
      const cardHeight = 20 + wrappedLines.length * 11
      this.ensureSpace(cardHeight + 8)
      const y = this.cursorY - cardHeight

      this.page.filledRect(PAGE_MARGIN_X, y, CONTENT_WIDTH, cardHeight, index % 2 === 0 ? COLORS.surface : COLORS.panel)
      this.page.strokedRect(PAGE_MARGIN_X, y, CONTENT_WIDTH, cardHeight, COLORS.border)
      this.page.text(PAGE_MARGIN_X + 12, this.cursorY - 16, `Item ${index + 1}`, {
        font: 'bold',
        size: 8,
        color: COLORS.accent,
      })

      wrappedLines.forEach((line, lineIndex) => {
        this.page.text(PAGE_MARGIN_X + 12, this.cursorY - 30 - lineIndex * 11, line, {
          size: 9,
          color: COLORS.ink,
        })
      })

      this.cursorY = y - 8
    })
  }

  getPages() {
    return this.pages
  }
}

export function createDailyReportPdf(
  employee: Pick<EmployeeDetail, 'userName' | 'role' | 'territory'>,
  report: DailyReportSummary,
) {
  const layout = new PdfLayout()
  layout.drawHeader(employee, report)
  layout.drawMetaPanel(employee, report)
  layout.drawComments(report.repComments)

  buildSections(report).forEach((section) => layout.drawSection(section))

  const pages = layout.getPages()
  const fontRegularObjectNumber = 3 + pages.length * 2
  const fontBoldObjectNumber = fontRegularObjectNumber + 1
  const objects: string[] = []

  objects.push('<< /Type /Catalog /Pages 2 0 R >>')

  const pageObjectNumbers = pages.map((_, index) => 3 + index * 2)
  objects.push(
    `<< /Type /Pages /Count ${pages.length} /Kids [${pageObjectNumbers
      .map((pageNumber) => `${pageNumber} 0 R`)
      .join(' ')}] >>`,
  )

  pages.forEach((page, index) => {
    const pageObjectNumber = 3 + index * 2
    const contentObjectNumber = pageObjectNumber + 1
    const contentStream = page.toStream()
    const contentLength = new TextEncoder().encode(contentStream).length

    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontRegularObjectNumber} 0 R /F2 ${fontBoldObjectNumber} 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`,
    )
    objects.push(`<< /Length ${contentLength} >>\nstream\n${contentStream}\nendstream`)
  })

  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>')

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = [0]

  objects.forEach((objectBody, index) => {
    offsets.push(pdf.length)
    pdf += `${index + 1} 0 obj\n${objectBody}\nendobj\n`
  })

  const xrefOffset = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'

  offsets.slice(1).forEach((offset) => {
    pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`
  })

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return new Blob([pdf], { type: 'application/pdf' })
}

function buildSections(report: DailyReportSummary): PdfSection[] {
  return [
    {
      title: 'Route Summary',
      scalarEntries: scalarEntries(report.routeSummary),
      groupedEntries: [],
      tableGroups: [],
    },
    {
      title: 'Visit Summary',
      scalarEntries: scalarEntries(report.visitSummary, ['outlets']),
      groupedEntries: [],
      tableGroups: [{ title: 'Visited Outlets', items: arrayEntries(report.visitSummary, 'outlets') }],
    },
    {
      title: 'OSA Summary',
      scalarEntries: scalarEntries(report.osaSummary, ['issues']),
      groupedEntries: [],
      tableGroups: [{ title: 'OSA Issues', items: arrayEntries(report.osaSummary, 'issues') }],
    },
    {
      title: 'Delivery Summary',
      scalarEntries: scalarEntries(report.deliverySummary, ['orders']),
      groupedEntries: [],
      tableGroups: [{ title: 'Assisted Orders', items: arrayEntries(report.deliverySummary, 'orders') }],
    },
    {
      title: 'Return Summary',
      scalarEntries: scalarEntries(report.returnSummary, ['items']),
      groupedEntries: [],
      tableGroups: [{ title: 'Returned Items', items: arrayEntries(report.returnSummary, 'items') }],
    },
    {
      title: 'Incident Summary',
      scalarEntries: scalarEntries(report.incidentSummary, ['incidents', 'bySeverity', 'byType']),
      groupedEntries: [
        { title: 'Incidents By Severity', entries: recordEntries(report.incidentSummary, 'bySeverity') },
        { title: 'Incidents By Type', entries: recordEntries(report.incidentSummary, 'byType') },
      ],
      tableGroups: [{ title: 'Incident Log', items: arrayEntries(report.incidentSummary, 'incidents') }],
    },
  ]
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
  return Object.entries(value as Record<string, unknown>)
}

function displayForPdf(value: unknown) {
  if (value == null || value === '') {
    return 'N/A'
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }
  if (typeof value === 'string' && looksLikeIsoDate(value)) {
    return formatDateTime(value)
  }
  return String(value)
}

function wrapText(value: string, maxChars: number) {
  if (value.length <= maxChars) {
    return [value]
  }

  const words = value.split(/\s+/)
  const lines: string[] = []
  let currentLine = ''

  words.forEach((word) => {
    const candidate = currentLine ? `${currentLine} ${word}` : word
    if (candidate.length <= maxChars) {
      currentLine = candidate
      return
    }
    if (currentLine) {
      lines.push(currentLine)
    }
    currentLine = word
  })

  if (currentLine) {
    lines.push(currentLine)
  }

  return lines
}

function escapePdfText(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString()
}

function looksLikeIsoDate(value: string) {
  return /\d{4}-\d{2}-\d{2}T/.test(value) || /\d{4}-\d{2}-\d{2}$/.test(value)
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
