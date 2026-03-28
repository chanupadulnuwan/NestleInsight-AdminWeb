import { apiClient } from './client'

export interface PortalActivityEntry {
  id: string
  type: string
  title: string
  message: string
  metadata: Record<string, unknown> | null
  createdAt: string
}

export async function fetchPortalActivities() {
  const { data } = await apiClient.get<{ message: string; activities: PortalActivityEntry[] }>(
    '/activities',
  )
  return data
}
