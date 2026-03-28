import { apiClient } from './client'
import type {
  AssignmentUserRecord,
  ShopOwnerAssignmentRecord,
  VehicleRecord,
} from './territories'

export type WarehouseOrderWindow = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ANNUALLY'

export interface WarehouseSummaryRecord {
  id: string
  name: string
  slug: string
  territoryId: string
  territoryName: string
  address: string
  latitude: number | null
  longitude: number | null
  phoneNumber: string
  managerUserId: string | null
  managerName: string
  inventoryItemCount: number
  inventoryCases: number
  inventoryUnits: number
  createdAt: string
  updatedAt: string
}

export interface WarehouseInventoryRecord {
  id: string
  productId: string
  productName: string
  sku: string
  packSize: string
  casesOnHand: number
  unitsOnHand: number
  reorderLevel: number
  maxCapacityCases: number
  stockValue: number
  casePrice: number
  status: 'HEALTHY' | 'LOW_STOCK' | 'INACTIVE_PRODUCT'
  updatedAt: string
}

export interface WarehouseOrderRecord {
  id: string
  orderCode: string
  shopName: string
  status: string
  totalAmount: number
  itemCount: number
  totalCases: number
  placedAt: string
}

export interface WarehouseDetailRecord extends WarehouseSummaryRecord {
  inventory: WarehouseInventoryRecord[]
  inventorySummary: {
    trackedProducts: number
    totalCasesOnHand: number
    totalUnitsOnHand: number
    totalStockValue: number
    lowStockProducts: number
  }
  managers: AssignmentUserRecord[]
  distributors: AssignmentUserRecord[]
  shopOwners: ShopOwnerAssignmentRecord[]
  vehicles: VehicleRecord[]
  orders: {
    period: WarehouseOrderWindow
    summary: {
      totalOrders: number
      totalAmount: number
      totalCases: number
    }
    records: WarehouseOrderRecord[]
  }
}

export interface CreateWarehousePayload {
  territoryId: string
  name: string
  address: string
  phoneNumber: string
  managerUserId?: string
  latitude?: number
  longitude?: number
}

export interface WarehouseAssignmentLookup {
  message: string
  warehouse: {
    id: string
    name: string
    territoryId: string
    territoryName: string
    latitude: number | null
    longitude: number | null
    managerUserId: string | null
    managerName: string | null
  }
}

export async function fetchWarehouses(territoryId?: string, search?: string) {
  const { data } = await apiClient.get<{
    message: string
    warehouses: WarehouseSummaryRecord[]
  }>('/warehouses', {
    params: {
      ...(territoryId ? { territoryId } : {}),
      ...(search?.trim() ? { search: search.trim() } : {}),
    },
  })

  return data
}

export async function fetchWarehouseDetails(
  warehouseId: string,
  orderWindow: WarehouseOrderWindow = 'MONTHLY',
) {
  const { data } = await apiClient.get<{
    message: string
    warehouse: WarehouseDetailRecord
  }>(`/warehouses/${warehouseId}`, {
    params: {
      orderWindow,
    },
  })

  return data
}

export async function createWarehouse(payload: CreateWarehousePayload) {
  const { data } = await apiClient.post<{
    message: string
    warehouse: WarehouseDetailRecord
  }>('/warehouses', payload)

  return data
}

export async function updateWarehouseInventory(
  warehouseId: string,
  items: Array<{
    id: string
    quantityOnHand: number
    reorderLevel: number
    maxCapacityCases: number
  }>,
) {
  const { data } = await apiClient.patch<{
    message: string
    warehouse: WarehouseDetailRecord
  }>(`/warehouses/${warehouseId}/inventory`, { items })

  return data
}

export async function lookupWarehouseByName(name: string) {
  const { data } = await apiClient.get<WarehouseAssignmentLookup>('/warehouses/lookup', {
    params: {
      name: name.trim(),
    },
  })

  return data
}
