import axios from 'axios'

const adminApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1',
  withCredentials: true,
})

const getToken = () =>
  typeof window !== 'undefined'
    ? localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token')
    : null

const getRefreshToken = () =>
  typeof window !== 'undefined' ? localStorage.getItem('admin_refresh_token') : null

const clearSession = () => {
  localStorage.removeItem('admin_token')
  localStorage.removeItem('admin_refresh_token')
  sessionStorage.removeItem('admin_token')
}

adminApi.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let isRefreshing = false
let refreshQueue: Array<(token: string) => void> = []

adminApi.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry && typeof window !== 'undefined') {
      const refreshToken = getRefreshToken()
      if (refreshToken) {
        if (isRefreshing) {
          return new Promise((resolve) => {
            refreshQueue.push((token) => {
              original.headers.Authorization = `Bearer ${token}`
              resolve(adminApi(original))
            })
          })
        }
        original._retry = true
        isRefreshing = true
        try {
          const { data } = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'}/auth/refresh`,
            { refreshToken },
            { withCredentials: true }
          )
          const newToken = data.accessToken
          localStorage.setItem('admin_token', newToken)
          if (data.refreshToken) localStorage.setItem('admin_refresh_token', data.refreshToken)
          refreshQueue.forEach((cb) => cb(newToken))
          refreshQueue = []
          original.headers.Authorization = `Bearer ${newToken}`
          return adminApi(original)
        } catch {
          clearSession()
          window.location.href = '/login'
        } finally {
          isRefreshing = false
        }
      } else {
        clearSession()
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default adminApi

// ─── API functions ────────────────────────────────────────────────────────────

export const adminApiFns = {
  getStats: () => adminApi.get('/admin/stats').then((r) => r.data),
  getGrowth: () => adminApi.get('/admin/growth').then((r) => r.data),
  getUsers: (params?: { page?: number; search?: string; role?: string }) =>
    adminApi.get('/admin/users', { params }).then((r) => r.data),
  updateUserRole: (id: string, role: string) =>
    adminApi.put(`/admin/users/${id}/role`, { role }).then((r) => r.data),
  deleteUser: (id: string) => adminApi.delete(`/admin/users/${id}`).then((r) => r.data),
  getUser: (id: string) => adminApi.get(`/admin/users/${id}`).then((r) => r.data),
  updateUserSubscription: (id: string, tier: string) =>
    adminApi.put(`/admin/users/${id}/subscription`, { tier }).then((r) => r.data),
  getCommunity: (page = 1) =>
    adminApi.get('/admin/community', { params: { page } }).then((r) => r.data),
  deleteCommunityPost: (postId: string) =>
    adminApi.delete(`/admin/community/${postId}`).then((r) => r.data),
  getContent: () => adminApi.get('/admin/content').then((r) => r.data),
  createContent: (payload: Record<string, unknown>) =>
    adminApi.post('/admin/content', payload).then((r) => r.data),
  getAchievements: () => adminApi.get('/admin/achievements').then((r) => r.data),
  login: (email: string, password: string) =>
    adminApi.post('/auth/login', { email, password }).then((r) => r.data),
}
