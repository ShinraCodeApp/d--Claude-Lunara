import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { MMKV } from 'react-native-mmkv'

// Fast persistent storage
const storage = new MMKV({ id: 'lunara-store' })
const mmkvStorage = {
  getItem: (key: string) => storage.getString(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
}

// ─── Auth Store ───────────────────────────────────────────────
interface User {
  id: string
  email: string
  role: string
  profile: {
    firstName?: string
    lastName?: string
    avatarUrl?: string
    onboardingCompleted: boolean
  } | null
  subscription: {
    tier: string
    status: string
    isPremium: boolean
    currentPeriodEnd?: string
  } | null
}

interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  setUser: (user: User) => void
  setToken: (token: string) => void
  logout: () => void
  updateProfile: (profile: Partial<User['profile']>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: true }),
      setToken: (accessToken) => set({ accessToken }),
      logout: () => set({ user: null, accessToken: null, isAuthenticated: false }),
      updateProfile: (profile) =>
        set((state) => ({
          user: state.user
            ? { ...state.user, profile: { ...state.user.profile, ...profile } as User['profile'] }
            : null,
        })),
    }),
    {
      name: 'auth',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

// ─── Cycle Store ──────────────────────────────────────────────
interface CycleState {
  currentCycleId: string | null
  currentPhase: 'menstrual' | 'follicular' | 'ovulatory' | 'luteal' | null
  dayOfCycle: number | null
  nextPeriodDate: string | null
  nextOvulationDate: string | null
  fertileWindowStart: string | null
  fertileWindowEnd: string | null
  predictionConfidence: number
  isInPeriod: boolean
  setCurrentCycle: (data: Partial<CycleState>) => void
  clearCycle: () => void
}

export const useCycleStore = create<CycleState>()(
  persist(
    (set) => ({
      currentCycleId: null,
      currentPhase: null,
      dayOfCycle: null,
      nextPeriodDate: null,
      nextOvulationDate: null,
      fertileWindowStart: null,
      fertileWindowEnd: null,
      predictionConfidence: 0,
      isInPeriod: false,
      setCurrentCycle: (data) => set((state) => ({ ...state, ...data })),
      clearCycle: () => set({
        currentCycleId: null, currentPhase: null, dayOfCycle: null,
        nextPeriodDate: null, nextOvulationDate: null,
        fertileWindowStart: null, fertileWindowEnd: null,
        predictionConfidence: 0, isInPeriod: false,
      }),
    }),
    {
      name: 'cycle',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
)

// ─── Garden Store ─────────────────────────────────────────────
interface GardenState {
  stage: 'SEED' | 'SPROUT' | 'FLOWER' | 'LUNAR_GARDEN'
  xp: number
  level: number
  crystalBalance: number
  currentStreak: number
  longestStreak: number
  setGarden: (data: Partial<GardenState>) => void
}

export const useGardenStore = create<GardenState>()(
  persist(
    (set) => ({
      stage: 'SEED',
      xp: 0,
      level: 1,
      crystalBalance: 0,
      currentStreak: 0,
      longestStreak: 0,
      setGarden: (data) => set((state) => ({ ...state, ...data })),
    }),
    {
      name: 'garden',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
)

// ─── App Settings Store ───────────────────────────────────────
interface SettingsState {
  theme: 'light' | 'dark' | 'auto'
  locale: string
  useMascot: boolean
  notificationsEnabled: boolean
  hasSeenOnboarding: boolean
  setTheme: (theme: SettingsState['theme']) => void
  setLocale: (locale: string) => void
  setUseMascot: (v: boolean) => void
  setHasSeenOnboarding: (v: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'auto',
      locale: 'es',
      useMascot: true,
      notificationsEnabled: false,
      hasSeenOnboarding: false,
      setTheme: (theme) => set({ theme }),
      setLocale: (locale) => set({ locale }),
      setUseMascot: (useMascot) => set({ useMascot }),
      setHasSeenOnboarding: (hasSeenOnboarding) => set({ hasSeenOnboarding }),
    }),
    {
      name: 'settings',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
)
