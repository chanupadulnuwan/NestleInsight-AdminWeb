import { apiClient } from './client'

export interface Outlet {
  id: string
  outletName: string
  ownerName: string
  ownerPhone: string | null
  ownerEmail: string | null
  address: string | null
  territoryId: string | null
  warehouseId: string | null
  latitude: number | null
  longitude: number | null
  registeredBySalesRepId: string | null
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'
  rejectionReason: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
}

export async function fetchPendingOutlets() {
  const { data } = await apiClient.get<{ message: string; outlets: Outlet[] }>('/outlets/pending')
  return data
}

export async function reviewOutlet(
  outletId: string,
  payload: {
    decision: 'APPROVED' | 'REJECTED'
    rejectionReason?: string
  },
) {
  const { data } = await apiClient.patch<{ message: string; outlet: Outlet }>(
    `/outlets/${outletId}/review`,
    payload,
  )
  return data
}
