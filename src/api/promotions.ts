import { apiClient } from './client'

export type PromotionStatus = 'draft' | 'scheduled' | 'active' | 'expired' | 'disabled'
export type PromotionType = 'code_based_product' | 'code_based_order' | 'auto_applied'
export type DiscountType = 'percentage' | 'fixed'

export interface PromotionRecord {
  id: string
  name: string
  code: string | null
  description: string | null
  startDate: string
  endDate: string
  status: PromotionStatus
  promotionType: PromotionType
  discountType: DiscountType
  discountValue: number
  minQuantity: number | null
  minOrderValue: number | null
  usageLimit: number | null
  perShopLimit: number | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface PromotionPayload {
  name: string
  code?: string
  description?: string
  startDate: string
  endDate: string
  status?: PromotionStatus
  promotionType: PromotionType
  discountType: DiscountType
  discountValue: number
  minQuantity?: number | null
  minOrderValue?: number | null
  usageLimit?: number | null
  perShopLimit?: number | null
  eligibleProductIds?: string[]
  eligibleTerritoryIds?: string[]
}

export async function fetchPromotions() {
  const { data } = await apiClient.get<PromotionRecord[]>('/promotions')
  return data
}

export async function createPromotion(payload: PromotionPayload) {
  const { data } = await apiClient.post<PromotionRecord>('/promotions', payload)
  return data
}

export async function updatePromotion(id: string, payload: Partial<PromotionPayload>) {
  const { data } = await apiClient.patch<PromotionRecord>(`/promotions/${id}`, payload)
  return data
}
