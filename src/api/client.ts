import axios from 'axios'

export const WEB_ACCESS_TOKEN_KEY = 'insight.web.accessToken'

function normalizePathname(pathname: string) {
  if (pathname === '/') {
    return ''
  }

  return pathname.replace(/\/+$/, '')
}

function toSameOriginBaseUrl(url: URL) {
  return `${normalizePathname(url.pathname)}${url.search}`
}

function toAbsoluteBaseUrl(url: URL) {
  return `${url.origin}${normalizePathname(url.pathname)}${url.search}`
}

function resolveApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
  const localDevTarget =
    import.meta.env.DEV &&
    (import.meta.env.VITE_API_PROXY_TARGET?.trim() || 'http://localhost:3000')

  if (!configuredBaseUrl) {
    return localDevTarget || ''
  }

  try {
    if (typeof window === 'undefined') {
      return toAbsoluteBaseUrl(new URL(configuredBaseUrl))
    }

    const resolvedBaseUrl = new URL(configuredBaseUrl, window.location.origin)

    if (resolvedBaseUrl.origin === window.location.origin) {
      return toSameOriginBaseUrl(resolvedBaseUrl)
    }

    if (
      window.location.protocol === 'https:' &&
      resolvedBaseUrl.protocol === 'http:'
    ) {
      console.warn(
        '[api] Ignoring insecure VITE_API_BASE_URL on an HTTPS page to avoid mixed-content requests. Serve the backend over HTTPS or proxy it through the same origin instead.',
      )

      return toSameOriginBaseUrl(resolvedBaseUrl)
    }

    return toAbsoluteBaseUrl(resolvedBaseUrl)
  } catch {
    return configuredBaseUrl.replace(/\/+$/, '')
  }
}

export const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(),
})

apiClient.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem(WEB_ACCESS_TOKEN_KEY)

  if (accessToken) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${accessToken}`
  }

  return config
})

export function getApiErrorMessage(
  error: unknown,
  fallbackMessage = 'Something went wrong. Please try again.',
) {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data

    if (typeof payload === 'string' && payload.trim()) {
      return payload
    }

    if (payload && typeof payload === 'object') {
      const message = (payload as { message?: unknown }).message

      if (Array.isArray(message)) {
        return message.filter((item): item is string => typeof item === 'string').join(' ')
      }

      if (typeof message === 'string' && message.trim()) {
        return message
      }
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallbackMessage
}

export function getApiErrorCode(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return undefined
  }

  const payload = error.response?.data
  if (!payload || typeof payload !== 'object') {
    return undefined
  }

  const code = (payload as { code?: unknown }).code
  return typeof code === 'string' ? code : undefined
}
