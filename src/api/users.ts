import { apiClient } from './client'
import type { AuthUser } from './auth'

export async function fetchPendingUsers() {
  const { data } = await apiClient.get<{ message: string; users: AuthUser[] }>('/users/pending')
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
