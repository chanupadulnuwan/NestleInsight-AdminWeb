import { apiClient } from './client'

export interface DemandForecastExportParams {
  fromDate?: string
  toDate?: string
  forecastDays?: number
}

function getFallbackExportFilename() {
  return `ars_demand_forecast_export_${new Date().toISOString().slice(0, 10)}.zip`
}

function parseDownloadFilename(contentDisposition: string | undefined) {
  if (!contentDisposition) {
    return getFallbackExportFilename()
  }

  const utfMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utfMatch?.[1]) {
    return decodeURIComponent(utfMatch[1].trim())
  }

  const basicMatch = contentDisposition.match(/filename="?([^"]+)"?/i)
  return basicMatch?.[1]?.trim() || getFallbackExportFilename()
}

export async function downloadArsDemandForecastExport(
  params: DemandForecastExportParams,
) {
  const requestParams: Record<string, string | number> = {}

  if (params.fromDate) {
    requestParams.fromDate = params.fromDate
  }

  if (params.toDate) {
    requestParams.toDate = params.toDate
  }

  if (params.forecastDays) {
    requestParams.forecastDays = params.forecastDays
  }

  const response = await apiClient.get<Blob>('/exports/ars-demand-forecast', {
    params: requestParams,
    responseType: 'blob',
  })

  return {
    blob: response.data,
    filename: parseDownloadFilename(response.headers['content-disposition']),
  }
}
