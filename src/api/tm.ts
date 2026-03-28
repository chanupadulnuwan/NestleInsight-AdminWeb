import { apiClient } from './client'

// ─── Types ───────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'PLACED'
  | 'APPROVED'
  | 'PROCEED'
  | 'DELAYED'
  | 'ASSIGNED'
  | 'COMPLETED'
  | 'CANCELLED'

export interface TmInventoryItem {
  id: string
  productId: string
  productName: string | null
  sku: string | null
  packSize: string | null
  imageUrl: string | null
  quantityOnHand: number
  reorderLevel: number
  maxCapacityCases: number
  status: 'HEALTHY' | 'LOW_STOCK' | 'INACTIVE_PRODUCT'
}

export interface TmWarehouseVehicle {
  id: string
  vehicleCode: string
  registrationNumber: string
  label: string
  type: string
  capacityCases: number
  status: string
}

export interface TmWarehouseProductOption {
  id: string
  productName: string
  sku: string
  packSize: string
  imageUrl: string | null
  casePrice: number
}

export interface TmWarehouseUser {
  id: string
  publicUserCode: string | null
  firstName: string
  lastName: string
  username: string
  email: string
  phoneNumber: string
  role: 'TERRITORY_DISTRIBUTOR' | 'SHOP_OWNER'
  accountStatus: string
  approvalStatus: string
  shopName: string | null
  address: string | null
}

export interface TmWarehouse {
  id: string
  name: string
  address: string
  phoneNumber: string
  latitude: number | null
  longitude: number | null
  territoryId: string
  territory: string | null
  inventory: TmInventoryItem[]
  vehicles: TmWarehouseVehicle[]
  availableVehicles: TmWarehouseVehicle[]
  catalog: TmWarehouseProductOption[]
  users: TmWarehouseUser[]
}

export interface TmOrder {
  id: string
  orderCode: string
  shopName: string
  userId: string
  status: OrderStatus
  totalAmount: number
  currencyCode: string
  placedAt: string
  approvedAt: string | null
  customerNote: string | null
  delayReason: string | null
  delayedAt: string | null
  deliveryDueAt: string
  assignmentId: string | null
  isOverdue: boolean
  items: Array<{
    id: string
    productId: string | null
    productName: string
    quantity: number
    lineTotal: number
  }>
}

export interface TmOrderProcessingPreviewItem {
  itemId: string
  productId: string | null
  productName: string
  quantity: number
  lineTotal: number
  availableCases: number
  isAvailable: boolean
  reason: string | null
}

export interface TmOrderProcessingPreview {
  orderId: string
  orderCode: string
  shopName: string
  currentTotal: number
  availableTotal: number
  allItemsAvailable: boolean
  deliveryDueAt: string
  availableItems: TmOrderProcessingPreviewItem[]
  unavailableItems: TmOrderProcessingPreviewItem[]
}

export interface TmPendingUser {
  id: string
  publicUserCode: string | null
  firstName: string
  lastName: string
  username: string
  email: string
  phoneNumber: string
  role: string
  accountStatus: string
  approvalStatus: string
  shopName: string | null
  address: string | null
  createdAt: string
}

export interface TmAssignment {
  id: string
  distributorId: string
  distributorName: string | null
  vehicleId: string | null
  vehicleLabel: string | null
  vehicleCapacityCases: number | null
  vehicleRegistrationNumber: string | null
  vehicleType: string | null
  deliveryDate: string
  status: string
  notes: string | null
  orders: Array<{
    daoId: string
    orderId: string | null
    sortOrder: number
    orderCode: string | null
    shopName: string | null
    totalAmount: number | null
    status: string | null
  }>
  createdAt: string
}

export interface TmReturn {
  id: string
  assignmentId: string | null
  distributorId: string
  distributorName: string | null
  tmVerified: boolean
  verificationNote: string | null
  items: Array<{
    id: string
    productId: string | null
    productName: string
    quantity: number
    reason: string
  }>
  createdAt: string
}

export interface TmIncident {
  id: string
  assignmentId: string | null
  reportedBy: string
  reporterName: string | null
  incidentType: string
  description: string
  createdAt: string
}

// ─── Warehouse ────────────────────────────────────────────────────────────────

export async function fetchMyWarehouse() {
  const { data } = await apiClient.get<{ message: string; warehouse: TmWarehouse }>('/tm/warehouse')
  return data
}

export async function fetchWarehouseUserDetail(userId: string) {
  const { data } = await apiClient.get<{ message: string; user: TmWarehouseUser & { nic?: string; employeeId?: string; latitude?: number; longitude?: number; createdAt: string } }>(`/tm/warehouse/users/${userId}`)
  return data
}

export async function addInventoryItem(payload: {
  productId: string
  quantityOnHand: number
  reorderLevel: number
  maxCapacityCases: number
}) {
  const { data } = await apiClient.post<{ message: string }>('/tm/warehouse/inventory', payload)
  return data
}

export async function assignVehicleToWarehouse(vehicleId: string) {
  const { data } = await apiClient.post<{ message: string }>(`/tm/warehouse/vehicles/${vehicleId}/assign`, {})
  return data
}

export async function createTmVehicle(payload: {
  label: string
  registrationNumber: string
  vehicleCode?: string
  type?: string
  capacityCases: number
}) {
  const { data } = await apiClient.post<{ message: string; vehicle: TmWarehouseVehicle }>(
    '/tm/warehouse/vehicles',
    payload,
  )
  return data
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export async function fetchTmOrders() {
  const { data } = await apiClient.get<{ message: string; orders: TmOrder[] }>('/tm/orders')
  return data
}

export async function approveTmOrder(orderId: string) {
  const { data } = await apiClient.patch<{ message: string }>(`/tm/orders/${orderId}/approve`, {})
  return data
}

export async function fetchTmOrderProcessingPreview(orderId: string) {
  const { data } = await apiClient.get<{
    message: string
    preview: TmOrderProcessingPreview
  }>(`/tm/orders/${orderId}/process-preview`)
  return data
}

export async function processTmOrder(
  orderId: string,
  payload: {
    decision: 'READY_TO_DELIVER' | 'PROCEED_AVAILABLE' | 'CANCEL_ORDER'
    explanation?: string
  },
) {
  const { data } = await apiClient.patch<{ message: string }>(`/tm/orders/${orderId}/process`, payload)
  return data
}

export async function delayTmOrder(orderId: string, reason: string) {
  const { data } = await apiClient.patch<{ message: string }>(`/tm/orders/${orderId}/delay`, { reason })
  return data
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function fetchTmPendingUsers() {
  const { data } = await apiClient.get<{ message: string; users: TmPendingUser[] }>('/tm/users/pending')
  return data
}

export async function approveTmUser(userId: string) {
  const { data } = await apiClient.patch<{ message: string }>(`/tm/users/${userId}/approve`, {})
  return data
}

export async function rejectTmUser(userId: string, reason: string) {
  const { data } = await apiClient.patch<{ message: string }>(`/tm/users/${userId}/reject`, { reason })
  return data
}

// ─── Delivery Assignments ─────────────────────────────────────────────────────

export async function fetchTmAssignments(date?: string) {
  const params = date ? `?date=${date}` : ''
  const { data } = await apiClient.get<{ message: string; assignments: TmAssignment[] }>(`/delivery-assignments${params}`)
  return data
}

export async function createTmAssignment(payload: {
  distributorId: string
  vehicleId?: string
  orderIds: string[]
  deliveryDate?: string
  notes?: string
}) {
  const { data } = await apiClient.post<{
    message: string
    assignment: TmAssignment
    shopPins: Array<{ orderId: string; pin: string }>
  }>('/delivery-assignments', payload)
  return data
}

export async function generateReturnPin(assignmentId: string) {
  const { data } = await apiClient.post<{ message: string; pin: string; expiresAt: string }>(
    '/delivery-assignments/return-pin',
    { assignmentId },
  )
  return data
}

// ─── Returns & Incidents ──────────────────────────────────────────────────────

export async function fetchTmReturns() {
  const { data } = await apiClient.get<{ message: string; returns: TmReturn[] }>('/delivery-assignments/returns')
  return data
}

export async function fetchTmIncidents() {
  const { data } = await apiClient.get<{ message: string; incidents: TmIncident[] }>('/delivery-assignments/incidents')
  return data
}
