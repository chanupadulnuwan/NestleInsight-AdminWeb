import { apiClient } from './client'

export interface InsightCenterParams {
  period?: string
  fromDate?: string
  toDate?: string
  granularity?: string
  demandType?: string
  viewMode?: string
  confidenceLevel?: string
  compareMode?: string
  source?: string
  territoryId?: string
  warehouseId?: string
  routeId?: string
  shopId?: string
  productId?: string
}

export interface InsightCenterSummary {
  generatedAt: string
  historyStartDate: string
  historyEndDate: string
  period: string
  granularity: string
  demandType: string
  viewMode: string
  confidenceLevel: string
  compareMode: string
  exactSignalLabel: string
  estimatedSignalLabel: string
  dataIntegrityWarning: string
  aiSummary: string[]
}

export interface InsightKpi {
  key: string
  label: string
  value: number
  unit: string
  sourceType: 'exact' | 'estimated' | 'hybrid'
  confidenceScore: number | null
  caption: string
}

export interface InsightTrendPoint {
  date: string
  label: string
  ordered_cases: number
  delivered_cases: number
  estimated_retail_offtake_cases: number
  forecast_cases: number
  confidence_score: number
  stockout_count: number
  display_ordered_cases: number
  display_delivered_cases: number
  display_estimated_retail_offtake_cases: number
  display_forecast_cases: number
}

export interface InsightActualVsForecast {
  demand_type: 'REPLENISHMENT_DEMAND' | 'ESTIMATED_RETAIL_OFFTAKE'
  product_id: string
  product_name: string
  territory_id: string | null
  actual_cases: number
  forecast_cases: number
  wape: number
  forecast_bias: number
}

export interface InsightHeatmapRow {
  territory_id: string | null
  territory_name: string
  product_id: string
  product_name: string
  ordered_cases: number
  delivered_cases: number
  estimated_retail_offtake_cases: number
  demand_gap_cases: number
  stockout_count: number
  confidence_score: number
  intensity_score: number
}

export interface InsightDemandSplitRow {
  segment: string
  cases: number
  source_type: string
}

export interface InsightPromotionImpactRow {
  phase: string
  ordered_cases: number
  estimated_retail_offtake_cases: number
}

export interface InsightStockoutImpactRow {
  product_id: string
  product_name: string
  territory_name: string
  stockout_count: number
  estimated_lost_demand_cases: number
}

export interface InsightCompetitorPressureRow {
  label: string
  mentions: number
  high_severity: number
}

export interface InsightFeedbackThemeRow {
  theme: string
  count: number
}

export interface InsightVisitCoverageRow {
  territory_id: string | null
  territory_name: string
  active_outlets: number
  visit_count: number
  days_since_last_visit: number | null
  confidence_score: number
}

export interface InsightWaterfallRow {
  driver: string
  cases: number
  direction: 'base' | 'up' | 'down' | 'total'
}

export interface InsightExceptionRow {
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  exception_type: string
  reason: string
  recommended_action: string
}

export interface InsightDrilldownRow {
  shop_name: string
  product_name: string
  ordered_cases: number
  delivered_cases: number
  estimated_retail_offtake_cases: number
  demand_gap_cases: number
  stockout_count: number
  confidence_score: number
}

export interface InsightFilterOption {
  value: string
  label: string
}

export interface InsightWarehouseOption extends InsightFilterOption {
  territoryId: string | null
}

export interface InsightCenterDashboard {
  summary: InsightCenterSummary
  controls: {
    periods: string[]
    granularities: string[]
    demandTypes: string[]
    viewModes: string[]
    confidenceLevels: string[]
    compareModes: string[]
    normalizers: string[]
    territories: InsightFilterOption[]
    warehouses: InsightWarehouseOption[]
  }
  kpis: InsightKpi[]
  charts: {
    tabs: string[]
    trend: InsightTrendPoint[]
    actualVsForecast: InsightActualVsForecast[]
    territoryHeatmap: InsightHeatmapRow[]
    demandSplit: InsightDemandSplitRow[]
    promotionImpact: InsightPromotionImpactRow[]
    stockoutImpact: InsightStockoutImpactRow[]
    competitorPressure: InsightCompetitorPressureRow[]
    feedbackThemes: InsightFeedbackThemeRow[]
    visitCoverageConfidence: InsightVisitCoverageRow[]
    waterfall: InsightWaterfallRow[]
    exceptions: InsightExceptionRow[]
  }
  drilldowns: InsightDrilldownRow[]
  reportLinks: {
    csv: string
    pdf: string
  }
}

function buildParams(params: InsightCenterParams) {
  const requestParams: Record<string, string | number> = {}

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      requestParams[key] = value
    }
  })

  return requestParams
}

function fallbackFilename(extension: 'csv' | 'pdf') {
  return `demand_planner_insight_center_${new Date().toISOString().slice(0, 10)}.${extension}`
}

function parseDownloadFilename(
  contentDisposition: string | undefined,
  extension: 'csv' | 'pdf',
) {
  if (!contentDisposition) return fallbackFilename(extension)

  const utfMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utfMatch?.[1]) return decodeURIComponent(utfMatch[1].trim())

  const basicMatch = contentDisposition.match(/filename="?([^"]+)"?/i)
  return basicMatch?.[1]?.trim() || fallbackFilename(extension)
}

export async function fetchInsightCenterDashboard(params: InsightCenterParams) {
  const { data } = await apiClient.get<InsightCenterDashboard>(
    '/insight-center/dashboard',
    { params: buildParams(params) },
  )
  return data
}

export async function downloadInsightCenterCsv(params: InsightCenterParams) {
  const response = await apiClient.get<Blob>('/insight-center/report.csv', {
    params: buildParams(params),
    responseType: 'blob',
  })

  return {
    blob: response.data,
    filename: parseDownloadFilename(response.headers['content-disposition'], 'csv'),
  }
}

export async function downloadInsightCenterPdf(params: InsightCenterParams) {
  const response = await apiClient.get<Blob>('/insight-center/report.pdf', {
    params: buildParams(params),
    responseType: 'blob',
  })

  return {
    blob: response.data,
    filename: parseDownloadFilename(response.headers['content-disposition'], 'pdf'),
  }
}
