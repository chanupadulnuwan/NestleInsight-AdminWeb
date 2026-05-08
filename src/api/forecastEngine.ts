import { apiClient } from './client'

export interface ForecastEngineParams {
  fromDate?: string
  toDate?: string
  forecastDays?: number
  backtestDays?: number
  productId?: string
  planningWindow?: string
}

export interface ForecastEngineSummary {
  generatedAt: string
  forecastStartDate: string
  forecastEndDate: string
  historyStartDate: string
  historyEndDate: string
  forecastRows: number
  exceptions: number
  aiSignals: number
  averageConfidenceScore: number
  averageWape: number | null
  modelVersion: string
  planningWindow: string
  selectedProductId: string | null
  sourceMode: 'live' | 'imported_bundle'
}

export interface ForecastControlOption {
  value: string
  label: string
  days?: number
  sku?: string
}

export interface ForecastOutputRow {
  forecast_id: string
  forecast_date: string
  demand_type: 'REPLENISHMENT_DEMAND' | 'ESTIMATED_RETAIL_OFFTAKE'
  product_id: string
  product_name: string
  territory_id: string | null
  warehouse_id: string | null
  weighted_recent_demand_cases: number
  seasonal_pattern_adjustment_cases: number
  promotion_adjustment_cases: number
  stockout_adjustment_cases: number
  visit_frequency_adjustment_cases: number
  incident_or_disruption_adjustment_cases: number
  forecast_cases: number
  confidence_score: number
  confidence_level: string
  model_version: string
  explanation: string
}

export interface ForecastAccuracyRow {
  demand_type: ForecastOutputRow['demand_type']
  product_id: string
  product_name: string
  territory_id: string | null
  warehouse_id: string | null
  backtest_start_date: string
  backtest_end_date: string
  actual_cases: number
  forecast_cases: number
  absolute_error_cases: number
  wape: number
  mape: number
  forecast_bias: number
  tested_days: number
}

export interface ForecastExceptionRow {
  exception_id: string
  exception_date: string
  demand_type: ForecastOutputRow['demand_type']
  product_id: string
  product_name: string
  territory_id: string | null
  warehouse_id: string | null
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  exception_type: string
  reason: string
  recommended_action: string
}

export interface ForecastConfidenceRow {
  forecast_id: string
  forecast_date: string
  demand_type: ForecastOutputRow['demand_type']
  product_id: string
  product_name: string
  data_completeness_score: number
  visit_recency_score: number
  count_quality_score: number
  delivery_accuracy_score: number
  uncertainty_penalty: number
  confidence_score: number
  confidence_level: string
}

export interface ForecastAiExplanationRow {
  explanation_id: string
  source_type: string
  source_id: string
  signal_date: string
  product_id: string | null
  product_name: string | null
  territory_id: string | null
  extracted_signal: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  confidence_score: number
  forecast_adjustment_reason: string
  business_explanation: string
}

export interface ManufacturePlanPoint {
  date: string
  total_forecast_cases: number
  replenishment_forecast_cases: number
  retail_offtake_forecast_cases: number
  recommended_manufacture_cases: number
}

export interface PlannerRecommendation {
  recommendation_id: string
  product_id: string
  product_name: string
  forecast_cases: number
  replenishment_forecast_cases: number
  retail_offtake_forecast_cases: number
  current_stock_cases: number
  safety_stock_cases: number
  required_cases: number
  recommended_production_cases: number
  suggested_daily_manufacture_cases: number
  average_confidence_score: number
  action: 'INCREASE' | 'HOLD' | 'DECREASE'
  urgency: 'HIGH' | 'MEDIUM' | 'LOW'
  reason_summary: string
  reasons: string[]
  horizon_start: string
  horizon_end: string
}

export interface PlannerBriefTopic {
  title: string
  detail: string
}

export interface PlannerBrief {
  title: string
  headline: string
  executiveSummary: string
  topics: PlannerBriefTopic[]
}

export interface ForecastEnginePreview {
  summary: ForecastEngineSummary
  controls: {
    planningWindows: ForecastControlOption[]
    products: ForecastControlOption[]
  }
  sourceSummary: {
    mode: 'live' | 'imported_bundle'
    label: string
    packageName: string | null
    note: string
  }
  plannerBrief: PlannerBrief
  manufacturePlan: ManufacturePlanPoint[]
  productionRecommendations: PlannerRecommendation[]
  forecastOutput: ForecastOutputRow[]
  accuracyReport: ForecastAccuracyRow[]
  exceptions: ForecastExceptionRow[]
  confidenceScores: ForecastConfidenceRow[]
  aiExplanations: ForecastAiExplanationRow[]
}

function buildParams(params: ForecastEngineParams) {
  const requestParams: Record<string, string | number> = {}

  if (params.fromDate) requestParams.fromDate = params.fromDate
  if (params.toDate) requestParams.toDate = params.toDate
  if (params.forecastDays) requestParams.forecastDays = params.forecastDays
  if (params.backtestDays) requestParams.backtestDays = params.backtestDays
  if (params.productId) requestParams.productId = params.productId
  if (params.planningWindow) requestParams.planningWindow = params.planningWindow

  return requestParams
}

function buildImportFormData(bundle: File, params: ForecastEngineParams) {
  const formData = new FormData()
  formData.append('bundle', bundle)

  const requestParams = buildParams(params)
  Object.entries(requestParams).forEach(([key, value]) => {
    formData.append(key, String(value))
  })

  return formData
}

function getFallbackReportFilename() {
  return `ars_demand_forecast_planner_${new Date().toISOString().slice(0, 10)}.pdf`
}

function parseDownloadFilename(contentDisposition: string | undefined) {
  if (!contentDisposition) return getFallbackReportFilename()

  const utfMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utfMatch?.[1]) return decodeURIComponent(utfMatch[1].trim())

  const basicMatch = contentDisposition.match(/filename="?([^"]+)"?/i)
  return basicMatch?.[1]?.trim() || getFallbackReportFilename()
}

export async function fetchForecastEnginePreview(params: ForecastEngineParams) {
  const { data } = await apiClient.get<ForecastEnginePreview>(
    '/forecast-engine/ars-demand/preview',
    { params: buildParams(params) },
  )
  return data
}

export async function fetchImportedForecastEnginePreview(
  bundle: File,
  params: ForecastEngineParams,
) {
  const { data } = await apiClient.post<ForecastEnginePreview>(
    '/forecast-engine/ars-demand/import-preview',
    buildImportFormData(bundle, params),
  )
  return data
}

export async function downloadForecastEngineReport(params: ForecastEngineParams) {
  const response = await apiClient.get<Blob>('/forecast-engine/ars-demand/report', {
    params: buildParams(params),
    responseType: 'blob',
  })

  return {
    blob: response.data,
    filename: parseDownloadFilename(response.headers['content-disposition']),
  }
}

export async function downloadImportedForecastEngineReport(
  bundle: File,
  params: ForecastEngineParams,
) {
  const response = await apiClient.post<Blob>(
    '/forecast-engine/ars-demand/import-report',
    buildImportFormData(bundle, params),
    {
      responseType: 'blob',
    },
  )

  return {
    blob: response.data,
    filename: parseDownloadFilename(response.headers['content-disposition']),
  }
}
