import { apiClient } from './client'

export interface AssignmentUserRecord {
  id: string
  fullName: string
  username: string
  phoneNumber: string
  warehouseId: string | null
  warehouseName: string | null
  accountStatus: string
}

export interface ShopOwnerAssignmentRecord {
  id: string
  shopName: string
  ownerName: string
  phoneNumber: string
  address: string | null
  warehouseId: string | null
  warehouseName: string | null
  accountStatus: string
}

export interface VehicleRecord {
  id: string
  vehicleCode: string
  registrationNumber: string
  label: string
  type: string
  capacityCases: number
  status: string
  warehouseId: string | null
  warehouseName: string | null
}

export interface TerritoryWarehouseSummary {
  id: string
  name: string
  slug: string
  territoryId: string
  address: string
  latitude: number | null
  longitude: number | null
  phoneNumber: string
  managerUserId: string | null
  managerName: string
  inventoryItemCount: number
  createdAt: string
  updatedAt: string
}

export interface TerritoryRecord {
  id: string
  name: string
  slug: string
  latitude: number
  longitude: number
  warehouseCount: number
  createdAt: string
  updatedAt: string
  warehouses: TerritoryWarehouseSummary[]
  managers: AssignmentUserRecord[]
  distributors: AssignmentUserRecord[]
  shopOwners: ShopOwnerAssignmentRecord[]
  vehicles: VehicleRecord[]
}

export interface CreateTerritoryPayload {
  name: string
  latitude: number
  longitude: number
}

export interface LocationAssignmentResponse {
  message: string
  territory: {
    id: string
    name: string
    slug: string
    distanceKm: number
  } | null
  warehouse: {
    id: string
    name: string
    slug: string
    territoryId: string
    territoryName: string
    distanceKm: number
  } | null
}

export async function fetchTerritories() {
  const { data } = await apiClient.get<{
    message: string
    territories: TerritoryRecord[]
  }>('/territories')

  return data
}

export async function createTerritory(payload: CreateTerritoryPayload) {
  const { data } = await apiClient.post<{
    message: string
    territory: TerritoryRecord
  }>('/territories', payload)

  return data
}

export async function resolveLocationAssignment(latitude: number, longitude: number) {
  const { data } = await apiClient.get<LocationAssignmentResponse>('/territories/resolve', {
    params: {
      latitude,
      longitude,
    },
  })

  return data
}
