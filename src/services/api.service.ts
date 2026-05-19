import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import type { Pinia } from 'pinia'
import { env } from '@/lib/env'
import { useAuthStore } from '@/stores/auth.store'
import type { ApiErrorBody } from '@/types/api.type'

const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete'])

export const api: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15000,
  withCredentials: true,
  xsrfCookieName: 'csrfToken',
  xsrfHeaderName: 'X-CSRF-Token',
  withXSRFToken: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

function getCookieValue(name: string): string | null {
  const encodedName = `${encodeURIComponent(name)}=`
  const cookie = document.cookie
    .split('; ')
    .find((item) => item.startsWith(encodedName))

  return cookie ? decodeURIComponent(cookie.slice(encodedName.length)) : null
}

function attachCsrfToken(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  const method = config.method?.toLowerCase()

  if (!method || !MUTATING_METHODS.has(method)) {
    return config
  }

  const csrfToken = getCookieValue('csrfToken')

  if (csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken
  }

  return config
}

function getErrorMessage(error: AxiosError<ApiErrorBody>): string {
  const responseMessage = error.response?.data?.message

  if (Array.isArray(responseMessage)) {
    return responseMessage[0] ?? 'Yêu cầu thất bại'
  }

  return responseMessage ?? error.message ?? 'Yêu cầu thất bại'
}

export function setupApiInterceptors(pinia: Pinia): void {
  const authStore = useAuthStore(pinia)

  api.interceptors.request.use(attachCsrfToken)

  api.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError<ApiErrorBody>) => {
      if (error.response?.status === 401) {
        authStore.setUnauthenticated()
      }

      return Promise.reject({
        message: getErrorMessage(error),
        statusCode: error.response?.status,
        details: error.response?.data,
      })
    },
  )
}
