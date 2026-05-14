import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import type { Pinia } from 'pinia'
import { useAuthStore } from '@/stores/auth.store'
import type { ApiErrorBody } from '@/types/api'
import type { RefreshTokenResponse } from '@/types/auth'

interface RetryableAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api'

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

let refreshPromise: Promise<string | null> | null = null

function getErrorMessage(error: AxiosError<ApiErrorBody>): string {
  const responseMessage = error.response?.data?.message

  if (Array.isArray(responseMessage)) {
    return responseMessage[0] ?? 'Request failed'
  }

  return responseMessage ?? error.message ?? 'Request failed'
}

export function setupApiInterceptors(pinia: Pinia): void {
  const authStore = useAuthStore(pinia)

  api.interceptors.request.use((config) => {
    if (authStore.accessToken) {
      config.headers.Authorization = `Bearer ${authStore.accessToken}`
    }

    return config
  })

  api.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError<ApiErrorBody>) => {
      const originalRequest = error.config as RetryableAxiosRequestConfig | undefined
      const status = error.response?.status

      if (
        status === 401 &&
        originalRequest &&
        !originalRequest._retry &&
        originalRequest.url !== '/auth/refresh'
      ) {
        originalRequest._retry = true

        refreshPromise ??= api
          .post<RefreshTokenResponse>('/auth/refresh')
          .then((response) => {
            authStore.setAccessToken(response.data.accessToken)

            if (response.data.user) {
              authStore.setUser(response.data.user)
            }

            return response.data.accessToken
          })
          .catch(() => {
            authStore.clearAuth()
            return null
          })
          .finally(() => {
            refreshPromise = null
          })

        const newAccessToken = await refreshPromise

        if (newAccessToken) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
          return api(originalRequest)
        }
      }

      return Promise.reject({
        message: getErrorMessage(error),
        statusCode: status,
        details: error.response?.data,
      })
    },
  )
}
