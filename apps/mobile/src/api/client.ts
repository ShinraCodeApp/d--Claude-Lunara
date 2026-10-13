import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { MMKV } from 'react-native-mmkv'
import { useAuthStore } from '@/store'

const storage = new MMKV({ id: 'lunara-store' })

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1'

// El servidor (Render gratis) se duerme tras 15 min sin uso y tarda ~100 s en despertar,
// más que el timeout de las peticiones. Lo despertamos al abrir la app y las pantallas
// de login esperan a `wakeServer()` antes de enviar, mostrando un aviso mientras tanto.
const AWAKE_TTL_MS = 10 * 60 * 1000
const PING_TIMEOUT_MS = 40000
let awakeUntil = 0
let wakePromise: Promise<boolean> | null = null

async function pingHealth(timeoutMs: number): Promise<boolean> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${BASE_URL}/health`, { signal: controller.signal })
    return res.ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

export function isServerAwake(): boolean {
  return Date.now() < awakeUntil
}

export function wakeServer(maxWaitMs = 150000): Promise<boolean> {
  if (isServerAwake()) return Promise.resolve(true)
  if (!wakePromise) {
    wakePromise = (async () => {
      const deadline = Date.now() + maxWaitMs
      while (Date.now() < deadline) {
        if (await pingHealth(Math.min(PING_TIMEOUT_MS, deadline - Date.now()))) {
          awakeUntil = Date.now() + AWAKE_TTL_MS
          return true
        }
        await new Promise((resolve) => setTimeout(resolve, 3000))
      }
      return false
    })().finally(() => {
      wakePromise = null
    })
  }
  return wakePromise
}

wakeServer().catch(() => null)

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 90000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
})

// ─── Request interceptor — attach auth token ──────────────────
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ─── Response interceptor — token refresh ────────────────────
let isRefreshing = false
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = []

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error)
    else prom.resolve(token!)
  })
  failedQueue = []
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return apiClient(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const storedRefresh = useAuthStore.getState().refreshToken
        const response = await apiClient.post('/auth/refresh', { refreshToken: storedRefresh })
        const { accessToken, refreshToken: newRefresh } = response.data

        useAuthStore.getState().setToken(accessToken)
        if (newRefresh) useAuthStore.getState().setRefreshToken(newRefresh)
        processQueue(null, accessToken)

        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return apiClient(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError)
        useAuthStore.getState().logout()
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient
