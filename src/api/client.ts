import axios from 'axios'

export const WEB_ACCESS_TOKEN_KEY = 'insight.web.accessToken'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
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
