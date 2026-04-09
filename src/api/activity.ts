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

export interface OrderFeedbackEntry {
  id: string
  rating: number
  comment: string | null
  createdAt: string
  order: {
    id: string
  }
  shopOwner: {
    firstName: string
    lastName: string
  }
}

export async function getMyTerritoryFeedback() {
  const { data } = await apiClient.get<OrderFeedbackEntry[]>('/activities/feedback/my-territory')
  return data
}
