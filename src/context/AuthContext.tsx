import type { ReactNode } from 'react'
import { createContext, useContext, useEffect, useState } from 'react'
import {
  fetchCurrentPortalUser,
  isPortalUserRole,
  logoutPortalAccount,
  type AuthUser,
} from '../api/auth'
import { WEB_ACCESS_TOKEN_KEY } from '../api/client'

interface AuthContextValue {
  user: AuthUser | null
  isAuthLoading: boolean
  completeSession: (accessToken: string, user: AuthUser) => void
  refreshSession: () => Promise<AuthUser | null>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)

  const clearSession = () => {
    localStorage.removeItem(WEB_ACCESS_TOKEN_KEY)
    setUser(null)
  }

  const completeSession = (accessToken: string, nextUser: AuthUser) => {
    localStorage.setItem(WEB_ACCESS_TOKEN_KEY, accessToken)
    setUser(nextUser)
  }

  const refreshSession = async () => {
    try {
      const response = await fetchCurrentPortalUser()

      if (!isPortalUserRole(response.user?.role)) {
        clearSession()
        return null
      }

      setUser(response.user)
      return response.user
    } catch {
      clearSession()
      return null
    }
  }

  const logout = async () => {
    try {
      if (localStorage.getItem(WEB_ACCESS_TOKEN_KEY)) {
        await logoutPortalAccount()
      }
    } catch {
      // Website portal update: logout should still clear local state if the backend activity call fails.
    } finally {
      clearSession()
    }
  }

  useEffect(() => {
    let isActive = true

    const bootstrapSession = async () => {
      const clearBootSession = () => {
        localStorage.removeItem(WEB_ACCESS_TOKEN_KEY)

        if (isActive) {
          setUser(null)
        }
      }

      const accessToken = localStorage.getItem(WEB_ACCESS_TOKEN_KEY)

      if (!accessToken) {
        if (isActive) {
          setIsAuthLoading(false)
        }
        return
      }

      try {
        const response = await fetchCurrentPortalUser()

        if (!isPortalUserRole(response.user?.role)) {
          clearBootSession()
          return
        }

        if (isActive) {
          setUser(response.user)
        }
      } catch {
        clearBootSession()
      } finally {
        if (isActive) {
          setIsAuthLoading(false)
        }
      }
    }

    void bootstrapSession()

    return () => {
      isActive = false
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthLoading,
        completeSession,
        refreshSession,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// Website auth update: keep the portal hook beside the provider and silence the Fast Refresh export rule for this shared context file.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
