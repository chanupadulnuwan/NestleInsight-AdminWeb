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

export async function reviewRouteDeliveryApprovalRequest(
  approvalRequestId: string,
  payload: {
    decision: 'APPROVED' | 'REJECTED'
    notes?: string
  },
) {
  const { data } = await apiClient.patch<{
    message: string
    pin?: string
    pinExpiresAt?: string | null
  }>(`/sales-routes/approval-requests/${approvalRequestId}/review`, payload)
  return data
}

export async function reviewRouteLoadRequest(
  loadRequestId: string,
  payload: {
    decision: 'APPROVED' | 'REJECTED'
    notes?: string
  },
) {
  const { data } = await apiClient.patch<{
    message: string
    startPin?: string
    pinExpiresAt?: string | null
  }>(`/sales-routes/load-requests/${loadRequestId}/review`, payload)
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

export interface TextFeedbackEntry {
  id: string
  userId: string
  message: string
  status: string
  createdAt: string
  firstName: string
  lastName: string
  shopName: string | null
}

export async function getMyTerritoryTextFeedback() {
  const { data } = await apiClient.get<TextFeedbackEntry[]>('/activities/text-feedback/my-territory')
  return data
}
