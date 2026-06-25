import axios from 'axios'

const adminApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1',
  withCredentials: true,
})

adminApi.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('admin_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

adminApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('admin_token')
      window.location.href = '/login'
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
