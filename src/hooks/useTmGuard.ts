// src/hooks/useTmGuard.ts
// Drop this file into src/hooks/useTmGuard.ts
// Then replace the inline role check in every TM page with this hook.

import { useAuth } from '../context/AuthContext'

// All roles that are allowed to access the Territory Manager portal
export const TM_ROLES = ['REGIONAL_MANAGER', 'TERRITORY_DISTRIBUTOR'] as const

export type TmRole = typeof TM_ROLES[number]

/**
 * Use this at the top of every /tm/* page instead of the inline role check.
 *
 * Usage:
 *   const { user, isAuthLoading, isUnauthorized } = useTmGuard()
 *   if (isUnauthorized) return <Navigate to="/" replace />
 *   if (!user) return null
 */
export function useTmGuard() {
  const { user, isAuthLoading } = useAuth()

  const isUnauthorized =
    !isAuthLoading && (!user || !TM_ROLES.includes(user.role as TmRole))

  return { user, isAuthLoading, isUnauthorized }
}
