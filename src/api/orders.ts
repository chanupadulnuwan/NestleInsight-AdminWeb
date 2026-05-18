import { apiClient } from './client'

export interface AdminOrderSummaryRecord {
  id: string
  orderCode: string
  userId: string
  shopName: string
  territoryId: string | null
  territoryName: string | null
  warehouseId: string | null
  warehouseName: string | null
  status: string
  source: string
  paymentMethod: string
  currencyCode: string
  totalAmount: number
  appliedPromotionId: string | null
  appliedPromotionCode: string | null
  subtotalBeforeDiscount: number | null
  promotionDiscountTotal: number | null
  totalAfterDiscount: number | null
  placedAt: string
  approvedAt: string | null
  customerNote: string | null
  delayReason: string | null
  delayedAt: string | null
  deliveryDueAt: string
  isOverdue: boolean
  createdAt: string
  itemCount: number
  totalCases: number
}

export interface AdminOrderDetailItemRecord {
  id: string
  productId: string | null
  sku: string
  productName: string
  packSize: string | null
  imageUrl: string | null
  casePrice: number
  isCurrentlyAvailable: boolean
  quantity: number
  lineTotal: number
}

export interface AdminOrderDetailRecord
  extends Omit<AdminOrderSummaryRecord, 'itemCount' | 'totalCases'> {
  items: AdminOrderDetailItemRecord[]
}

export interface FetchAdminOrdersFilters {
  territoryId?: string
  warehouseId?: string
  dateFrom?: string
  dateTo?: string
}

export async function fetchAdminOrders(filters: FetchAdminOrdersFilters = {}) {
  const { data } = await apiClient.get<{
    message: string
    orders: AdminOrderSummaryRecord[]
  }>('/orders/admin', {
    params: {
      ...(filters.territoryId ? { territoryId: filters.territoryId } : {}),
      ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
      ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
      ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
    },
  })

  return data
}

export async function fetchAdminOrderDetails(orderId: string) {
  const { data } = await apiClient.get<{
    message: string
    order: AdminOrderDetailRecord
  }>(`/orders/admin/${orderId}`)

  return data
}
