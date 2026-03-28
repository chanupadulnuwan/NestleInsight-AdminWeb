import { apiClient } from './client'

export type BackendRole =
  | 'ADMIN'
  | 'SALES_REP'
  | 'TERRITORY_DISTRIBUTOR'
  | 'SHOP_OWNER'
  | 'DEMAND_PLANNER'
  | 'REGIONAL_MANAGER'

export type WebPortalRole = 'ADMIN' | 'REGIONAL_MANAGER'
export type AccountStatus = 'PENDING' | 'OTP_PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED'
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface AuthUser {
  id: string
  publicUserCode: string | null
  firstName: string
  lastName: string
  username: string
  email: string
  phoneNumber: string
  employeeId: string | null
  nic: string | null
  shopName: string | null
  address: string | null
  territoryId: string | null
  territoryName: string | null
  territory: string | null
  warehouseId: string | null
  warehouseName: string | null
  latitude: number | null
  longitude: number | null
  role: BackendRole
  platformAccess: 'MOBILE' | 'WEB'
  accountStatus: AccountStatus
  approvalStatus: ApprovalStatus
  approvedBy: string | null
  approvedAt: string | null
  rejectionReason: string | null
  isEmailVerified: boolean
  otpVerifiedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface AuthResponse {
  message: string
  accessToken?: string
  user?: AuthUser
  otpRequired?: boolean
  otpDeliveryMethod?: string
  debugOtpCode?: string
}

export interface PortalSignupPayload {
  firstName: string
  lastName: string
  phoneNumber: string
  email: string
  employeeId: string
  username: string
  role: WebPortalRole
  warehouseName?: string
  password: string
  confirmPassword: string
}

export function isPortalUserRole(role?: string): role is WebPortalRole {
  return role === 'ADMIN' || role === 'REGIONAL_MANAGER'
}

export async function loginPortalAccount(payload: { identifier: string; password: string }) {
  const { data } = await apiClient.post<AuthResponse>('/auth/login', {
    identifier: payload.identifier.trim(),
    password: payload.password,
    platformAccess: 'WEB',
  })

  return data
}

export async function registerPortalAccount(payload: PortalSignupPayload) {
  const warehouseName = payload.warehouseName?.trim()

  const { data } = await apiClient.post<AuthResponse>('/auth/register', {
    firstName: payload.firstName.trim(),
    lastName: payload.lastName.trim(),
    username: payload.username.trim(),
    email: payload.email.trim().toLowerCase(),
    phoneNumber: payload.phoneNumber.trim(),
    employeeId: payload.employeeId.trim(),
    password: payload.password,
    confirmPassword: payload.confirmPassword,
    role: payload.role,
    platformAccess: 'WEB',
    ...(payload.role === 'REGIONAL_MANAGER' && warehouseName
      ? { warehouseName }
      : {}),
  })

  return data
}

export async function verifyPortalOtp(payload: { identifier: string; otp: string }) {
  const { data } = await apiClient.post<AuthResponse>('/auth/otp/verify', {
    identifier: payload.identifier.trim(),
    otp: payload.otp.trim(),
  })

  return data
}

export async function resendPortalOtp(identifier: string) {
  const { data } = await apiClient.post<AuthResponse>('/auth/otp/resend', {
    identifier: identifier.trim(),
  })

  return data
}

export async function fetchCurrentPortalUser() {
  const { data } = await apiClient.get<{ message: string; user: AuthUser }>('/auth/me')
  return data
}

export async function logoutPortalAccount() {
  const { data } = await apiClient.post<{ message: string }>('/auth/logout')
  return data
}
