import { useState } from 'react'
import {
  Download,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'

const surfaceClassName =
  'rounded-[1.8rem] border border-[#ebdfd5] bg-white shadow-[0_20px_48px_rgba(59,31,15,0.08)]'

type InsightTab =
  | 'overview'
  | 'trends'
  | 'forecast'
  | 'promotions'
  | 'feedback'
  | 'risks'
  | 'drilldown'
  | 'report'

type ViewMode = 'absolute' | 'normalized' | 'confidence'
type Normalizer =
  | 'Total volume'
  | 'Per shop'
  | 'Per active outlet'
  | 'Per visit'
  | 'Per sales rep'
  | 'Per route day'
  | 'Per promotion-active shop'
  | 'Per 100 visits'

const tabs: Array<{ key: InsightTab; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'trends', label: 'Demand Trends' },
  { key: 'forecast', label: 'Forecast' },
  { key: 'promotions', label: 'Promotions' },
  { key: 'feedback', label: 'Competitors & Feedback' },
  { key: 'risks', label: 'Operations & Risks' },
  { key: 'drilldown', label: 'Shop / SKU Drilldown' },
  { key: 'report', label: 'Report' },
]

const viewModes: Array<{ key: ViewMode; label: string }> = [
  { key: 'absolute', label: 'Absolute Volume' },
  { key: 'normalized', label: 'Normalized Volume' },
  { key: 'confidence', label: 'Confidence-Adjusted View' },
]

const normalizers: Normalizer[] = [
  'Total volume',
  'Per shop',
  'Per active outlet',
  'Per visit',
  'Per sales rep',
  'Per route day',
  'Per promotion-active shop',
  'Per 100 visits',
]

const kpis = [
  {
    label: 'Total ordered cases',
    value: '48,920',
    delta: '+8.4%',
    tone: 'border-[#d8e6d4] bg-[#f6fbf2] text-[#456a3d]',
    purpose: 'Replenishment demand',
  },
  {
    label: 'Total delivered cases',
    value: '45,380',
    delta: '+5.1%',
    tone: 'border-[#cfe2ea] bg-[#f4fbfd] text-[#356577]',
    purpose: 'Market fulfillment',
  },
  {
    label: 'Estimated retail offtake',
    value: '52,740',
    delta: '82% confidence',
    tone: 'border-[#eed8ab] bg-[#fff9ea] text-[#7b5c20]',
    purpose: 'Estimated signal',
    estimated: true,
  },
  {
    label: 'Forecast next period',
    value: '55,100',
    delta: '+4.5%',
    tone: 'border-[#d6d7ec] bg-[#f7f7ff] text-[#4d5687]',
    purpose: 'Forward demand',
  },
  {
    label: 'Stockout rate',
    value: '6.8%',
    delta: '-1.2 pts',
    tone: 'border-[#efd2c8] bg-[#fff5f2] text-[#8a4d3c]',
    purpose: 'Service risk',
  },
  {
    label: 'Return rate',
    value: '1.9%',
    delta: '+0.3 pts',
    tone: 'border-[#e7d8c9] bg-[#fff8f1] text-[#755337]',
    purpose: 'Reverse flow',
  },
  {
    label: 'Promotion uplift',
    value: '+14.6%',
    delta: 'Milo focus',
    tone: 'border-[#dce7c4] bg-[#f8fbef] text-[#657431]',
    purpose: 'Campaign impact',
  },
  {
    label: 'Competitor pressure score',
    value: '64',
    delta: '+9',
    tone: 'border-[#eed1d8] bg-[#fff4f7] text-[#88485c]',
    purpose: 'Field intelligence',
  },
  {
    label: 'Feedback satisfaction score',
    value: '78',
    delta: '+4',
    tone: 'border-[#d2e5df] bg-[#f2fbf8] text-[#3f7166]',
    purpose: 'Shop sentiment',
  },
  {
    label: 'Data confidence score',
    value: '84%',
    delta: 'High',
    tone: 'border-[#d7dfcb] bg-[#f8fbf5] text-[#526842]',
    purpose: 'Signal quality',
  },
]

const trendSeries = [
  { label: 'W1', ordered: 6200, delivered: 5900, offtake: 6600, forecast: 6400, confidence: 0.84 },
  { label: 'W2', ordered: 6700, delivered: 6300, offtake: 7000, forecast: 6900, confidence: 0.82 },
  { label: 'W3', ordered: 6900, delivered: 6600, offtake: 7400, forecast: 7200, confidence: 0.86 },
  { label: 'W4', ordered: 7100, delivered: 6900, offtake: 7700, forecast: 7600, confidence: 0.83 },
  { label: 'W5', ordered: 7600, delivered: 7100, offtake: 8100, forecast: 7900, confidence: 0.78 },
  { label: 'W6', ordered: 7350, delivered: 7000, offtake: 7950, forecast: 8200, confidence: 0.8 },
  { label: 'W7', ordered: 7900, delivered: 7450, offtake: 8500, forecast: 8450, confidence: 0.85 },
  { label: 'W8', ordered: 8250, delivered: 7800, offtake: 8850, forecast: 8700, confidence: 0.87 },
]

const accuracyRows = [
  { period: 'Week 13', actual: 7050, forecast: 7220, error: '2.4%' },
  { period: 'Week 14', actual: 7460, forecast: 7380, error: '1.1%' },
  { period: 'Week 15', actual: 7310, forecast: 7640, error: '4.5%' },
  { period: 'Week 16', actual: 8120, forecast: 7950, error: '2.1%' },
  { period: 'Week 17', actual: 8360, forecast: 8610, error: '3.0%' },
]

const heatmapRows = [
  { territory: 'Western', products: [18, 11, 7, -3] },
  { territory: 'Central', products: [6, -8, 13, 5] },
  { territory: 'Southern', products: [10, 16, 4, 12] },
  { territory: 'North West', products: [-5, 3, 9, 6] },
  { territory: 'Uva', products: [4, 7, -11, 2] },
]

const sourceBars = [
  { label: 'Western', shop: 58, assisted: 20, backorder: 14, returns: 8 },
  { label: 'Central', shop: 49, assisted: 24, backorder: 18, returns: 9 },
  { label: 'Southern', shop: 64, assisted: 16, backorder: 12, returns: 8 },
  { label: 'Uva', shop: 43, assisted: 29, backorder: 21, returns: 7 },
]

const promotionRows = [
  { label: 'Before', orders: 4800, offtake: 5200, confidence: 0.81 },
  { label: 'During', orders: 6100, offtake: 7050, confidence: 0.84 },
  { label: 'After', orders: 5450, offtake: 5900, confidence: 0.79 },
]

const riskRows = [
  { label: 'Milk Powder 400g', stockouts: 18, lost: 1160, confidence: 0.82 },
  { label: 'Milo 200g', stockouts: 14, lost: 920, confidence: 0.78 },
  { label: 'Maggi Noodles', stockouts: 11, lost: 660, confidence: 0.86 },
  { label: 'Nescafe 50g', stockouts: 8, lost: 410, confidence: 0.74 },
]

const competitorRows = [
  { label: 'Price undercut', value: 37 },
  { label: 'Shelf takeover', value: 24 },
  { label: 'Bundle offers', value: 21 },
  { label: 'Cooler branding', value: 13 },
]

const feedbackRows = [
  { label: 'Late delivery', value: 31 },
  { label: 'Unavailable stock', value: 28 },
  { label: 'Pricing concern', value: 19 },
  { label: 'Damaged goods', value: 12 },
  { label: 'Competitor activity', value: 10 },
]

const coverageRows = [
  { territory: 'Western', coverage: 91, days: 2, confidence: 88 },
  { territory: 'Central', coverage: 82, days: 4, confidence: 79 },
  { territory: 'Southern', coverage: 86, days: 3, confidence: 84 },
  { territory: 'North West', coverage: 73, days: 6, confidence: 71 },
  { territory: 'Uva', coverage: 69, days: 8, confidence: 66 },
]

const waterfallRows = [
  { label: 'Base demand', value: 48100, type: 'base' },
  { label: 'Promotion uplift', value: 4200, type: 'up' },
  { label: 'Stockout drag', value: -1600, type: 'down' },
  { label: 'Incident drag', value: -700, type: 'down' },
  { label: 'Competitor pressure', value: -900, type: 'down' },
  { label: 'Seasonality', value: 6000, type: 'up' },
]

const drilldownRows = [
  {
    shop: 'Mahila Store',
    sku: 'Milo 200g',
    territory: 'Western',
    ordered: 420,
    delivered: 390,
    offtake: 455,
    confidence: 86,
    risk: 'Competitor shelf block',
  },
  {
    shop: 'De Costa Mart',
    sku: 'Milk Powder 400g',
    territory: 'Central',
    ordered: 360,
    delivered: 318,
    offtake: 392,
    confidence: 78,
    risk: 'Stockout gap',
  },
  {
    shop: 'Jayaratna Shop',
    sku: 'Maggi Noodles',
    territory: 'Southern',
    ordered: 510,
    delivered: 498,
    offtake: 548,
    confidence: 88,
    risk: 'Promotion response',
  },
  {
    shop: 'Wickrama Mart',
    sku: 'Nescafe 50g',
    territory: 'Uva',
    ordered: 210,
    delivered: 204,
    offtake: 231,
    confidence: 69,
    risk: 'Low visit coverage',
  },
]

const aiInsightItems = [
  'Estimated retail offtake is outpacing replenishment demand by 7.8%, with the strongest gap in Western territory.',
  'Milo promotion uplift is visible during active weeks, but two high-volume shops show stockout drag that may suppress future demand.',
  'Competitor pressure is concentrated around price undercutting and shelf takeover notes from field teams.',
  'North West and Uva confidence scores should be treated carefully until outlet coverage rises above 80%.',
]

function formatNumber(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 })
}

function confidenceLabel(value: number) {
  return `${Math.round(value * 100)}% confidence`
}

function valueForMode(value: number, viewMode: ViewMode, normalizer: Normalizer, confidence = 0.84) {
  if (viewMode === 'confidence') {
    return Math.round(value * confidence)
  }

  if (viewMode !== 'normalized') {
    return value
  }

  const divisors: Record<Normalizer, number> = {
    'Total volume': 1,
    'Per shop': 142,
    'Per active outlet': 118,
    'Per visit': 420,
    'Per sales rep': 18,
    'Per route day': 36,
    'Per promotion-active shop': 74,
    'Per 100 visits': 4.2,
  }

  return Math.round(value / divisors[normalizer])
}

function viewModeCopy(viewMode: ViewMode, normalizer: Normalizer) {
  if (viewMode === 'confidence') {
    return 'Confidence-adjusted cases'
  }

  if (viewMode === 'normalized') {
    return normalizer
  }

  return 'Absolute cases'
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function buildPdfBlob(lines: string[]) {
  const printableLines = lines.slice(0, 32)
  const content = [
    'BT /F2 18 Tf 48 746 Td (Demand Planner Insight Center) Tj ET',
    'BT /F1 10 Tf 48 724 Td (Planner-ready report generated from the web dashboard.) Tj ET',
    ...printableLines.map((line, index) => {
      const font = index === 0 ? '/F2 12 Tf' : '/F1 10 Tf'
      return `BT ${font} 48 ${698 - index * 18} Td (${escapePdfText(line)}) Tj ET`
    }),
  ].join('\n')

  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >> endobj',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj',
    `6 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj`,
  ]

  let pdf = '%PDF-1.4\n'
  const offsets = [0]

  objects.forEach((object) => {
    offsets.push(pdf.length)
    pdf += `${object}\n`
  })

  const xrefOffset = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'
  offsets.slice(1).forEach((offset) => {
    pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`
  })
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return new Blob([pdf], { type: 'application/pdf' })
}

function downloadBlob(blob: Blob, filename: string) {
  const downloadUrl = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = downloadUrl
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 1000)
}

export default function DemandPlannerInsightCenterSection() {
  const [activeTab, setActiveTab] = useState<InsightTab>('overview')
  const [viewMode, setViewMode] = useState<ViewMode>('absolute')
  const [normalizer, setNormalizer] = useState<Normalizer>('Total volume')
  const [timePeriod, setTimePeriod] = useState('Last 30 days')
  const [granularity, setGranularity] = useState('Weekly')
  const [demandType, setDemandType] = useState('Replenishment Demand + Estimated Retail Offtake')
  const [geography, setGeography] = useState('All territories')
  const [productHierarchy, setProductHierarchy] = useState('All categories')
  const [source, setSource] = useState('All sources')
  const [confidenceLevel, setConfidenceLevel] = useState('All data')
  const [compareMode, setCompareMode] = useState('Vs previous period')
  const [feedback, setFeedback] = useState<string | null>(null)

  const reportLines = [
    `Filters: ${timePeriod}, ${granularity}, ${geography}, ${productHierarchy}`,
    `Demand type: ${demandType}`,
    `View: ${viewModeCopy(viewMode, normalizer)}; compare mode: ${compareMode}`,
    'Data integrity: Estimated Retail Offtake is not exact transactional sales. It is estimated and confidence-scored.',
    'Top KPI: Total ordered cases 48,920; total delivered cases 45,380.',
    'Estimated Retail Offtake: 52,740 cases with 82% confidence.',
    'Forecast next period: 55,100 cases.',
    'Primary risk: Western territory offtake gap and competitor shelf pressure.',
    ...aiInsightItems.map((item) => `AI insight: ${item}`),
  ]

  const handleDownloadPdf = () => {
    downloadBlob(buildPdfBlob(reportLines), 'demand-planner-insight-center.pdf')
    setFeedback('Planner PDF report downloaded.')
  }

  const handleDownloadCsv = () => {
    const rows = [
      ['metric', 'value', 'signal_type', 'confidence', 'view'],
      ...kpis.map((kpi) => [
        kpi.label,
        kpi.value,
        kpi.estimated ? 'estimated' : 'operational',
        kpi.estimated ? '82%' : 'exact',
        viewModeCopy(viewMode, normalizer),
      ]),
      ...drilldownRows.map((row) => [
        `${row.shop} - ${row.sku}`,
        String(row.offtake),
        'estimated_retail_offtake',
        `${row.confidence}%`,
        viewModeCopy(viewMode, normalizer),
      ]),
    ]
    const csv = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n')

    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'demand-planner-insight-center.csv')
    setFeedback('CSV export downloaded.')
  }

  return (
    <div className="grid gap-6">
      <section className={`${surfaceClassName} overflow-hidden`}>
        <div className="border-b border-[#e8ddd3] bg-[linear-gradient(135deg,#f4fbf8_0%,#fff7ee_46%,#ffffff_100%)] px-6 py-6 sm:px-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#4f8175]">
                Demand Planner Workspace
              </p>
              <h2 className="mt-3 max-w-3xl text-[1.85rem] font-bold tracking-[-0.04em] text-[#263f39]">
                Operational demand, estimated offtake, and forecast evidence in one view
              </h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="inline-flex items-center gap-2 rounded-[1rem] bg-[#75543c] px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(117,84,60,0.18)] transition duration-300 hover:bg-[#5f4431]"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Export PDF
              </button>
              <button
                type="button"
                onClick={handleDownloadCsv}
                className="inline-flex items-center gap-2 rounded-[1rem] border border-[#bfd8cf] bg-white px-4 py-3 text-sm font-semibold text-[#3c7266] transition duration-300 hover:border-[#78a99a]"
              >
                <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
                Export CSV
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 rounded-[1.35rem] border border-[#efd9a8] bg-[#fff9ea] px-4 py-4 text-sm leading-6 text-[#765923] sm:flex-row sm:items-center">
            <ShieldAlert className="h-5 w-5 shrink-0" aria-hidden="true" />
            <p>
              Estimated Retail Offtake is not exact transactional sales. It is an estimated signal and remains
              labeled with a confidence score throughout this dashboard.
            </p>
          </div>
        </div>

        <div className="grid gap-4 px-6 py-6 sm:px-7 lg:grid-cols-4">
          <SelectControl label="Time Period" value={timePeriod} onChange={setTimePeriod} options={['Last 7 days', 'Last 30 days', 'Last 90 days', 'YTD', 'Custom range']} />
          <SelectControl label="Granularity" value={granularity} onChange={setGranularity} options={['Daily', 'Weekly', 'Monthly']} />
          <SelectControl label="Demand Type" value={demandType} onChange={setDemandType} options={['Replenishment Demand', 'Estimated Retail Offtake', 'Replenishment Demand + Estimated Retail Offtake']} />
          <SelectControl label="Geography" value={geography} onChange={setGeography} options={['All territories', 'Western territory', 'Central territory', 'Route W-12', 'Warehouse Colombo']} />
          <SelectControl label="Product Hierarchy" value={productHierarchy} onChange={setProductHierarchy} options={['All categories', 'Milo brand', 'Maggi brand', 'Milk powder SKUs', 'Nescafe SKUs']} />
          <SelectControl label="Source" value={source} onChange={setSource} options={['All sources', 'Shop-owner orders', 'Assisted orders', 'Deliveries', 'Returns']} />
          <SelectControl label="Confidence Level" value={confidenceLevel} onChange={setConfidenceLevel} options={['All data', 'High only']} />
          <SelectControl label="Compare Mode" value={compareMode} onChange={setCompareMode} options={['Vs previous period', 'Vs same period last month', 'Vs same period last year']} />
        </div>

        <div className="border-t border-[#efe4da] px-6 py-5 sm:px-7">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <SegmentedControl
              label="Chart View"
              options={viewModes}
              value={viewMode}
              onChange={setViewMode}
            />
            <div className="flex flex-wrap gap-2">
              {normalizers.map((option) => {
                const isActive = normalizer === option
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setNormalizer(option)
                      setViewMode('normalized')
                    }}
                    className={[
                      'rounded-full border px-3 py-2 text-xs font-semibold transition duration-200',
                      isActive && viewMode === 'normalized'
                        ? 'border-[#4f8175] bg-[#eef8f5] text-[#315f56]'
                        : 'border-[#eadfd5] bg-white text-[#766254] hover:border-[#c5aa92]',
                    ].join(' ')}
                  >
                    {option}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {feedback ? (
        <div className="rounded-[1rem] border border-[#cfe2c8] bg-[#f3fbef] px-4 py-3 text-sm text-[#4d6c45]">
          {feedback}
        </div>
      ) : null}

      <section className="flex gap-2 overflow-x-auto border-b border-[#eadfd5] pb-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={[
                'shrink-0 rounded-t-[1rem] border px-4 py-3 text-sm font-semibold transition duration-200',
                isActive
                  ? 'border-[#d6c2af] border-b-white bg-white text-[#4d3020] shadow-[0_10px_22px_rgba(62,34,18,0.08)]'
                  : 'border-transparent bg-[#fff8f2] text-[#806757] hover:border-[#eadfd5]',
              ].join(' ')}
            >
              {tab.label}
            </button>
          )
        })}
      </section>

      {activeTab === 'overview' ? (
        <OverviewTab viewMode={viewMode} normalizer={normalizer} />
      ) : null}
      {activeTab === 'trends' ? (
        <DemandTrendsTab viewMode={viewMode} normalizer={normalizer} />
      ) : null}
      {activeTab === 'forecast' ? (
        <ForecastTab viewMode={viewMode} normalizer={normalizer} />
      ) : null}
      {activeTab === 'promotions' ? (
        <PromotionsTab viewMode={viewMode} normalizer={normalizer} />
      ) : null}
      {activeTab === 'feedback' ? (
        <FeedbackTab />
      ) : null}
      {activeTab === 'risks' ? (
        <RisksTab viewMode={viewMode} normalizer={normalizer} />
      ) : null}
      {activeTab === 'drilldown' ? (
        <DrilldownTab viewMode={viewMode} normalizer={normalizer} />
      ) : null}
      {activeTab === 'report' ? (
        <ReportTab
          onDownloadCsv={handleDownloadCsv}
          onDownloadPdf={handleDownloadPdf}
          reportLines={reportLines}
        />
      ) : null}
    </div>
  )
}

function SelectControl({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-[#594235]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[1rem] border border-[#e3cdbc] bg-[#fffdfb] px-4 py-3 text-sm text-[#4d3020] outline-none transition duration-300 focus:border-[#cf9566]"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}

function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: Array<{ key: T; label: string }>
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-[#594235]">{label}</p>
      <div className="flex flex-wrap gap-2 rounded-[1.2rem] border border-[#eadfd5] bg-[#fffaf6] p-1">
        {options.map((option) => {
          const isActive = value === option.key
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => onChange(option.key)}
              className={[
                'rounded-[0.9rem] px-3 py-2 text-sm font-semibold transition duration-200',
                isActive ? 'bg-[#4f8175] text-white shadow-[0_10px_20px_rgba(79,129,117,0.18)]' : 'text-[#735d4e] hover:bg-white',
              ].join(' ')}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function OverviewTab({ viewMode, normalizer }: { viewMode: ViewMode; normalizer: Normalizer }) {
  return (
    <div className="grid gap-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map((kpi) => (
          <article key={kpi.label} className={`${surfaceClassName} px-5 py-5`}>
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-[#6f5a4a]">{kpi.label}</p>
              {kpi.estimated ? (
                <span className="rounded-full border border-[#e8c87d] bg-[#fff5d8] px-2 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[#80601e]">
                  Estimated
                </span>
              ) : null}
            </div>
            <p className="mt-3 text-[1.65rem] font-bold tracking-[-0.03em] text-[#2f241c]">{kpi.value}</p>
            <div className={`mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${kpi.tone}`}>
              {kpi.delta}
            </div>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#9a826f]">{kpi.purpose}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
        <TrendLineChart viewMode={viewMode} normalizer={normalizer} />
        <AiSummaryPanel />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <TerritoryHeatmap />
        <SourceStackedBars />
      </section>
    </div>
  )
}

function DemandTrendsTab({ viewMode, normalizer }: { viewMode: ViewMode; normalizer: Normalizer }) {
  return (
    <div className="grid gap-6">
      <TrendLineChart viewMode={viewMode} normalizer={normalizer} />
      <section className="grid gap-6 xl:grid-cols-2">
        <TerritoryHeatmap />
        <SourceStackedBars />
      </section>
    </div>
  )
}

function ForecastTab({ viewMode, normalizer }: { viewMode: ViewMode; normalizer: Normalizer }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
      <ActualForecastChart viewMode={viewMode} normalizer={normalizer} />
      <WaterfallChart />
      <AiSummaryPanel />
      <VisitCoverageChart />
    </div>
  )
}

function PromotionsTab({ viewMode, normalizer }: { viewMode: ViewMode; normalizer: Normalizer }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <PromotionImpactChart viewMode={viewMode} normalizer={normalizer} />
      <SourceStackedBars />
    </div>
  )
}

function FeedbackTab() {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <CompetitorPressureChart />
      <FeedbackThemeChart />
      <AiSummaryPanel />
      <VisitCoverageChart />
    </div>
  )
}

function RisksTab({ viewMode, normalizer }: { viewMode: ViewMode; normalizer: Normalizer }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <StockoutImpactChart viewMode={viewMode} normalizer={normalizer} />
      <VisitCoverageChart />
      <TerritoryHeatmap />
      <FeedbackThemeChart />
    </div>
  )
}

function DrilldownTab({ viewMode, normalizer }: { viewMode: ViewMode; normalizer: Normalizer }) {
  return (
    <section className={`${surfaceClassName} overflow-hidden`}>
      <div className="border-b border-[#efe1d5] px-6 py-5 sm:px-7">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#4f8175]">Shop / SKU Drilldown</p>
        <h3 className="mt-2 text-[1.45rem] font-bold tracking-[-0.03em] text-[#2f241c]">
          Exact orders beside estimated consumer demand
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[#efe1d5] bg-[#fff9f4] text-xs uppercase tracking-[0.14em] text-[#8b7463]">
            <tr>
              <th className="px-6 py-4">Shop</th>
              <th className="px-6 py-4">SKU</th>
              <th className="px-6 py-4">Territory</th>
              <th className="px-6 py-4">Ordered</th>
              <th className="px-6 py-4">Delivered</th>
              <th className="px-6 py-4">Estimated Retail Offtake</th>
              <th className="px-6 py-4">Risk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0e5dc] text-[#5e493a]">
            {drilldownRows.map((row) => (
              <tr key={`${row.shop}-${row.sku}`}>
                <td className="px-6 py-4 font-semibold text-[#3a2a21]">{row.shop}</td>
                <td className="px-6 py-4">{row.sku}</td>
                <td className="px-6 py-4">{row.territory}</td>
                <td className="px-6 py-4">{formatNumber(valueForMode(row.ordered, viewMode, normalizer))}</td>
                <td className="px-6 py-4">{formatNumber(valueForMode(row.delivered, viewMode, normalizer))}</td>
                <td className="px-6 py-4">
                  <div className="font-semibold text-[#75591f]">
                    {formatNumber(valueForMode(row.offtake, viewMode, normalizer, row.confidence / 100))}
                  </div>
                  <div className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#9b792f]">
                    Estimated, {row.confidence}% confidence
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="rounded-full border border-[#e5d3c3] bg-[#fff8f2] px-3 py-1.5 text-xs font-semibold text-[#725844]">
                    {row.risk}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function ReportTab({
  onDownloadCsv,
  onDownloadPdf,
  reportLines,
}: {
  onDownloadCsv: () => void
  onDownloadPdf: () => void
  reportLines: string[]
}) {
  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
      <article className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#4f8175]">Report Outputs</p>
        <div className="mt-5 grid gap-3">
          <button
            type="button"
            onClick={onDownloadPdf}
            className="inline-flex items-center justify-center gap-2 rounded-[1rem] bg-[#75543c] px-4 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-[#5f4431]"
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            Download PDF
          </button>
          <button
            type="button"
            onClick={onDownloadCsv}
            className="inline-flex items-center justify-center gap-2 rounded-[1rem] border border-[#bfd8cf] bg-white px-4 py-3 text-sm font-semibold text-[#3c7266] transition duration-300 hover:border-[#78a99a]"
          >
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            Download CSV
          </button>
        </div>
        <div className="mt-5 rounded-[1.25rem] border border-[#efd9a8] bg-[#fff9ea] px-4 py-4 text-sm leading-6 text-[#765923]">
          Estimated Retail Offtake remains estimated in report exports and includes confidence scoring.
        </div>
      </article>

      <article className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#4f8175]">Planner Report Preview</p>
        <div className="mt-5 grid gap-3">
          {reportLines.map((line) => (
            <div key={line} className="rounded-[1rem] border border-[#eadfd5] bg-[#fffaf6] px-4 py-3 text-sm leading-6 text-[#685243]">
              {line}
            </div>
          ))}
        </div>
      </article>
    </section>
  )
}

function AiSummaryPanel() {
  return (
    <article className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-[1rem] bg-[#eef8f5] text-[#4f8175]">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#4f8175]">AI Insight Summary</p>
          <h3 className="mt-1 text-[1.35rem] font-bold tracking-[-0.03em] text-[#2f241c]">Evidence-backed actions</h3>
        </div>
      </div>
      <div className="mt-5 grid gap-3">
        {aiInsightItems.map((item) => (
          <div key={item} className="rounded-[1rem] border border-[#dbeae5] bg-[#f6fbf9] px-4 py-4 text-sm leading-6 text-[#48675f]">
            {item}
          </div>
        ))}
      </div>
      <button
        type="button"
        className="mt-5 inline-flex items-center gap-2 rounded-[1rem] border border-[#bfd8cf] bg-white px-4 py-3 text-sm font-semibold text-[#3c7266] transition duration-300 hover:border-[#78a99a]"
      >
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        Refresh summary
      </button>
    </article>
  )
}

function TrendLineChart({ viewMode, normalizer }: { viewMode: ViewMode; normalizer: Normalizer }) {
  const width = 760
  const height = 260
  const paddingX = 48
  const paddingTop = 24
  const paddingBottom = 44
  const values = trendSeries.flatMap((point) => [
    valueForMode(point.ordered, viewMode, normalizer),
    valueForMode(point.delivered, viewMode, normalizer),
    valueForMode(point.offtake, viewMode, normalizer, point.confidence),
    valueForMode(point.forecast, viewMode, normalizer),
  ])
  const maxValue = Math.max(...values) * 1.12
  const minValue = Math.min(...values) * 0.86
  const xStep = (width - paddingX * 2) / (trendSeries.length - 1)
  const yFor = (value: number) =>
    paddingTop + (1 - (value - minValue) / (maxValue - minValue)) * (height - paddingTop - paddingBottom)
  const pointFor = (value: number, index: number) => `${paddingX + index * xStep},${yFor(value).toFixed(1)}`
  const orderedPoints = trendSeries.map((point, index) => pointFor(valueForMode(point.ordered, viewMode, normalizer), index)).join(' ')
  const deliveredPoints = trendSeries.map((point, index) => pointFor(valueForMode(point.delivered, viewMode, normalizer), index)).join(' ')
  const offtakePoints = trendSeries.map((point, index) => pointFor(valueForMode(point.offtake, viewMode, normalizer, point.confidence), index)).join(' ')
  const forecastPoints = trendSeries.map((point, index) => pointFor(valueForMode(point.forecast, viewMode, normalizer), index)).join(' ')
  const bandTop = trendSeries
    .map((point, index) => pointFor(valueForMode(point.forecast * 1.08, viewMode, normalizer), index))
    .join(' ')
  const bandBottom = trendSeries
    .slice()
    .reverse()
    .map((point, reverseIndex) => pointFor(valueForMode(point.forecast * 0.92, viewMode, normalizer), trendSeries.length - 1 - reverseIndex))
    .join(' ')

  return (
    <article className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#4f8175]">Demand Trend</p>
          <h3 className="mt-2 text-[1.45rem] font-bold tracking-[-0.03em] text-[#2f241c]">
            Orders, deliveries, estimated offtake, and forecast
          </h3>
        </div>
        <p className="rounded-full border border-[#dbeae5] bg-[#f6fbf9] px-3 py-1.5 text-xs font-semibold text-[#4f8175]">
          {viewModeCopy(viewMode, normalizer)}
        </p>
      </div>
      <div className="mt-5 overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="min-h-[16rem] min-w-[42rem]">
          {[0, 1, 2, 3].map((line) => {
            const y = paddingTop + line * ((height - paddingTop - paddingBottom) / 3)
            return <line key={line} x1={paddingX} x2={width - paddingX} y1={y} y2={y} stroke="#eadfd5" strokeWidth="1" />
          })}
          <polygon points={`${bandTop} ${bandBottom}`} fill="#e7f2ee" opacity="0.9" />
          <polyline points={orderedPoints} fill="none" stroke="#6b8f45" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={deliveredPoints} fill="none" stroke="#3f7d8f" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={offtakePoints} fill="none" stroke="#c08a2b" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={forecastPoints} fill="none" stroke="#6a67a6" strokeWidth="4" strokeDasharray="8 8" strokeLinecap="round" strokeLinejoin="round" />
          {trendSeries.map((point, index) => (
            <g key={point.label}>
              <text x={paddingX + index * xStep} y={height - 16} textAnchor="middle" className="fill-[#8b7463] text-[0.72rem] font-semibold">
                {point.label}
              </text>
              <circle cx={paddingX + index * xStep} cy={yFor(valueForMode(point.offtake, viewMode, normalizer, point.confidence))} r="5" fill="#c08a2b" stroke="#fff6e0" strokeWidth="3" />
            </g>
          ))}
        </svg>
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-[#655044]">
        <Legend color="#6b8f45" label="Ordered demand" />
        <Legend color="#3f7d8f" label="Delivered demand" />
        <Legend color="#c08a2b" label="Estimated Retail Offtake, 82% avg confidence" />
        <Legend color="#6a67a6" label="Forecast" />
        <Legend color="#d7e8e2" label="Forecast confidence band" />
      </div>
    </article>
  )
}

function ActualForecastChart({ viewMode, normalizer }: { viewMode: ViewMode; normalizer: Normalizer }) {
  const maxValue = Math.max(...accuracyRows.flatMap((row) => [row.actual, row.forecast]))

  return (
    <article className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#4f8175]">Actual vs Forecast</p>
      <h3 className="mt-2 text-[1.45rem] font-bold tracking-[-0.03em] text-[#2f241c]">Forecast quality by week</h3>
      <div className="mt-5 grid gap-4">
        {accuracyRows.map((row) => {
          const actual = valueForMode(row.actual, viewMode, normalizer)
          const forecast = valueForMode(row.forecast, viewMode, normalizer)
          return (
            <div key={row.period} className="grid gap-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-[#544033]">{row.period}</span>
                <span className="text-[#806757]">Error {row.error}</span>
              </div>
              <div className="grid gap-2">
                <BarTrack label="Actual" value={actual} width={(row.actual / maxValue) * 100} color="bg-[#6b8f45]" />
                <BarTrack label="Forecast" value={forecast} width={(row.forecast / maxValue) * 100} color="bg-[#6a67a6]" />
              </div>
            </div>
          )
        })}
      </div>
    </article>
  )
}

function TerritoryHeatmap() {
  const products = ['Milo', 'Maggi', 'Nescafe', 'Milk powder']

  return (
    <article className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#4f8175]">Territory Heatmap</p>
      <h3 className="mt-2 text-[1.35rem] font-bold tracking-[-0.03em] text-[#2f241c]">Growth, stockout rate, and demand gap hotspots</h3>
      <div className="mt-5 overflow-x-auto">
        <div className="min-w-[32rem]">
          <div className="grid grid-cols-[8rem_repeat(4,minmax(0,1fr))] gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#8b7463]">
            <span>Territory</span>
            {products.map((product) => (
              <span key={product}>{product}</span>
            ))}
          </div>
          <div className="mt-3 grid gap-2">
            {heatmapRows.map((row) => (
              <div key={row.territory} className="grid grid-cols-[8rem_repeat(4,minmax(0,1fr))] gap-2">
                <div className="rounded-[0.9rem] bg-[#fff8f2] px-3 py-3 text-sm font-semibold text-[#5d4536]">{row.territory}</div>
                {row.products.map((value, index) => (
                  <div
                    key={`${row.territory}-${products[index]}`}
                    className={[
                      'rounded-[0.9rem] px-3 py-3 text-center text-sm font-bold',
                      value >= 12
                        ? 'bg-[#e8f3e2] text-[#4f753a]'
                        : value >= 0
                          ? 'bg-[#f4f6e7] text-[#747c38]'
                          : 'bg-[#fff0ed] text-[#9a4d3f]',
                    ].join(' ')}
                  >
                    {value > 0 ? '+' : ''}
                    {value}%
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  )
}

function SourceStackedBars() {
  return (
    <article className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#4f8175]">Demand Composition</p>
      <h3 className="mt-2 text-[1.35rem] font-bold tracking-[-0.03em] text-[#2f241c]">Shop orders, assisted orders, backorders, and returns</h3>
      <div className="mt-5 grid gap-4">
        {sourceBars.map((row) => (
          <div key={row.label}>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold text-[#544033]">{row.label}</span>
              <span className="text-[#806757]">100%</span>
            </div>
            <div className="flex h-5 overflow-hidden rounded-full bg-[#f2e8df]">
              <span className="bg-[#6b8f45]" style={{ width: `${row.shop}%` }} />
              <span className="bg-[#3f7d8f]" style={{ width: `${row.assisted}%` }} />
              <span className="bg-[#d29b3d]" style={{ width: `${row.backorder}%` }} />
              <span className="bg-[#b35f58]" style={{ width: `${row.returns}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-[#655044]">
        <Legend color="#6b8f45" label="Shop-owner orders" />
        <Legend color="#3f7d8f" label="Assisted orders" />
        <Legend color="#d29b3d" label="Backorders" />
        <Legend color="#b35f58" label="Returns" />
      </div>
    </article>
  )
}

function PromotionImpactChart({ viewMode, normalizer }: { viewMode: ViewMode; normalizer: Normalizer }) {
  const maxValue = Math.max(...promotionRows.flatMap((row) => [row.orders, row.offtake]))

  return (
    <article className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#4f8175]">Promotion Impact</p>
      <h3 className="mt-2 text-[1.45rem] font-bold tracking-[-0.03em] text-[#2f241c]">Before, during, and after uplift</h3>
      <div className="mt-5 grid gap-5">
        {promotionRows.map((row) => (
          <div key={row.label} className="grid gap-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-[#544033]">{row.label}</span>
              <span className="font-semibold text-[#75591f]">Estimated offtake, {confidenceLabel(row.confidence)}</span>
            </div>
            <BarTrack label="Orders" value={valueForMode(row.orders, viewMode, normalizer)} width={(row.orders / maxValue) * 100} color="bg-[#6b8f45]" />
            <BarTrack label="Estimated Retail Offtake" value={valueForMode(row.offtake, viewMode, normalizer, row.confidence)} width={(row.offtake / maxValue) * 100} color="bg-[#c08a2b]" />
          </div>
        ))}
      </div>
    </article>
  )
}

function StockoutImpactChart({ viewMode, normalizer }: { viewMode: ViewMode; normalizer: Normalizer }) {
  const maxLost = Math.max(...riskRows.map((row) => row.lost))

  return (
    <article className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#4f8175]">Stockout Impact</p>
      <h3 className="mt-2 text-[1.45rem] font-bold tracking-[-0.03em] text-[#2f241c]">Stockout frequency vs estimated lost demand</h3>
      <div className="mt-5 grid gap-4">
        {riskRows.map((row) => (
          <div key={row.label} className="rounded-[1rem] border border-[#eadfd5] bg-[#fffaf6] px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-[#544033]">{row.label}</span>
              <span className="text-[#8a4d3c]">{row.stockouts} stockouts</span>
            </div>
            <div className="mt-3">
              <BarTrack
                label={`Estimated lost demand, ${confidenceLabel(row.confidence)}`}
                value={valueForMode(row.lost, viewMode, normalizer, row.confidence)}
                width={(row.lost / maxLost) * 100}
                color="bg-[#b35f58]"
              />
            </div>
          </div>
        ))}
      </div>
    </article>
  )
}

function CompetitorPressureChart() {
  const maxValue = Math.max(...competitorRows.map((row) => row.value))

  return (
    <article className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#4f8175]">Competitor Pressure</p>
      <h3 className="mt-2 text-[1.35rem] font-bold tracking-[-0.03em] text-[#2f241c]">Mentions by field intelligence theme</h3>
      <div className="mt-5 grid gap-4">
        {competitorRows.map((row) => (
          <BarTrack key={row.label} label={row.label} value={row.value} width={(row.value / maxValue) * 100} color="bg-[#b55b76]" />
        ))}
      </div>
    </article>
  )
}

function FeedbackThemeChart() {
  const maxValue = Math.max(...feedbackRows.map((row) => row.value))

  return (
    <article className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#4f8175]">Feedback Themes</p>
      <h3 className="mt-2 text-[1.35rem] font-bold tracking-[-0.03em] text-[#2f241c]">Complaints and shop-owner sentiment drivers</h3>
      <div className="mt-5 grid gap-4">
        {feedbackRows.map((row) => (
          <BarTrack key={row.label} label={row.label} value={row.value} width={(row.value / maxValue) * 100} color="bg-[#4f8175]" />
        ))}
      </div>
    </article>
  )
}

function VisitCoverageChart() {
  return (
    <article className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#4f8175]">Coverage & Confidence</p>
      <h3 className="mt-2 text-[1.35rem] font-bold tracking-[-0.03em] text-[#2f241c]">Outlet coverage, recency, and confidence by territory</h3>
      <div className="mt-5 grid gap-3">
        {coverageRows.map((row) => (
          <div key={row.territory} className="rounded-[1rem] border border-[#dbeae5] bg-[#f6fbf9] px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-semibold text-[#334a44]">{row.territory}</p>
              <p className="text-sm text-[#55736a]">{row.days} days since last visit</p>
            </div>
            <div className="mt-3 grid gap-2 text-sm text-[#55736a] sm:grid-cols-2">
              <BarTrack label="Outlet coverage" value={row.coverage} width={row.coverage} color="bg-[#3f7d8f]" suffix="%" />
              <BarTrack label="Confidence" value={row.confidence} width={row.confidence} color="bg-[#6b8f45]" suffix="%" />
            </div>
          </div>
        ))}
      </div>
    </article>
  )
}

function WaterfallChart() {
  const base = waterfallRows[0].value
  const total = waterfallRows.reduce((sum, row) => (row.type === 'base' ? sum : sum + row.value), base)
  const maxAbs = Math.max(...waterfallRows.map((row) => Math.abs(row.value)), total)

  return (
    <article className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#4f8175]">Forecast Change Drivers</p>
      <h3 className="mt-2 text-[1.35rem] font-bold tracking-[-0.03em] text-[#2f241c]">Why the forecast moved</h3>
      <div className="mt-5 grid gap-3">
        {waterfallRows.map((row) => {
          const width = Math.max(8, (Math.abs(row.value) / maxAbs) * 100)
          const color = row.type === 'down' ? 'bg-[#b35f58]' : row.type === 'up' ? 'bg-[#6b8f45]' : 'bg-[#3f7d8f]'
          return (
            <div key={row.label} className="grid gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-[#544033]">{row.label}</span>
                <span className={row.value < 0 ? 'font-semibold text-[#9a4d3f]' : 'font-semibold text-[#4f753a]'}>
                  {row.value > 0 && row.type !== 'base' ? '+' : ''}
                  {formatNumber(row.value)}
                </span>
              </div>
              <div className="h-4 rounded-full bg-[#f2e8df]">
                <div className={`h-4 rounded-full ${color}`} style={{ width: `${width}%` }} />
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-5 rounded-[1rem] border border-[#dbeae5] bg-[#f6fbf9] px-4 py-4 text-sm font-semibold text-[#48675f]">
        Forecast next period: {formatNumber(total)} cases
      </div>
    </article>
  )
}

function BarTrack({
  label,
  value,
  width,
  color,
  suffix = '',
}: {
  label: string
  value: number
  width: number
  color: string
  suffix?: string
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-xs font-semibold text-[#715a4a]">
        <span>{label}</span>
        <span>
          {formatNumber(value)}
          {suffix}
        </span>
      </div>
      <div className="h-3 rounded-full bg-[#f2e8df]">
        <div className={`h-3 rounded-full ${color}`} style={{ width: `${Math.max(4, Math.min(100, width))}%` }} />
      </div>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}
