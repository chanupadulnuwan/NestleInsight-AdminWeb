import { apiClient } from './client'
import type { AuthUser } from './auth'

export async function fetchPendingUsers() {
  const { data } = await apiClient.get<{ message: string; users: AuthUser[] }>('/users/pending')
  return data
}

export async function fetchManageableUsers() {
  const { data } = await apiClient.get<{ message: string; users: AuthUser[] }>('/users/manageable')
  return data
}

export async function approvePendingUser(userId: string) {
  const { data } = await apiClient.patch<{ message: string; user: AuthUser }>(`/users/${userId}/approve`)
  return data
}

export async function rejectPendingUser(userId: string, rejectionReason: string) {
  const { data } = await apiClient.patch<{ message: string; user: AuthUser }>(`/users/${userId}/reject`, {
    rejectionReason: rejectionReason.trim(),
  })

  return data
}

export async function updateUserStatus(
  userId: string,
  payload: { status: AuthUser['accountStatus']; reason?: string },
) {
  const { data } = await apiClient.patch<{ message: string; user: AuthUser }>(`/users/${userId}/status`, {
    status: payload.status,
    ...(payload.reason?.trim() ? { reason: payload.reason.trim() } : {}),
  })

  return data
}
