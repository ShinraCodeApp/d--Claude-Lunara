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
  refreshToken: string | null
  isAuthenticated: boolean
  setUser: (user: User) => void
  setToken: (token: string) => void
  setRefreshToken: (token: string) => void
  logout: () => void
  updateProfile: (profile: Partial<User['profile']>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: true }),
      setToken: (accessToken) => set({ accessToken }),
      setRefreshToken: (refreshToken) => set({ refreshToken }),
      logout: () => set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),
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
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
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
  purchasedItems: string[]
  setGarden: (data: Partial<GardenState>) => void
  earnCrystals: (amount: number) => void
  spendCrystals: (amount: number) => boolean
  purchaseItem: (itemId: string) => void
}

export const useGardenStore = create<GardenState>()(
  persist(
    (set, get) => ({
      stage: 'SEED',
      xp: 0,
      level: 1,
      crystalBalance: 0,
      currentStreak: 0,
      longestStreak: 0,
      purchasedItems: [],
      setGarden: (data) => set((state) => ({ ...state, ...data })),
      earnCrystals: (amount) => set((s) => ({ crystalBalance: s.crystalBalance + amount })),
      spendCrystals: (amount) => {
        const { crystalBalance } = get()
        if (crystalBalance < amount) return false
        set((s) => ({ crystalBalance: s.crystalBalance - amount }))
        return true
      },
      purchaseItem: (itemId) =>
        set((s) => ({ purchasedItems: s.purchasedItems.includes(itemId) ? s.purchasedItems : [...s.purchasedItems, itemId] })),
    }),
    {
      name: 'garden',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
)

// ─── Symptom Store ────────────────────────────────────────────
export interface IntimacyLog {
  hadSex: boolean
  protected: boolean | null
  orgasm: boolean | null
  desireLevel: number | null  // 1–5
}

export interface SleepLog {
  hours: number
  quality: 'bueno' | 'regular' | 'malo'
}

export interface SymptomEntry {
  id: string
  date: string  // YYYY-MM-DD
  phase: 'menstrual' | 'follicular' | 'ovulatory' | 'luteal' | null
  mood: string | null
  energy: 'alta' | 'media' | 'baja' | null
  symptoms: string[]
  bbt: number | null
  mucus: 'seco' | 'cremoso' | 'acuoso' | 'elástico' | null
  notes: string
  intimacy: IntimacyLog | null
  sleep: SleepLog | null
  weight: number | null   // kg
  water: number | null    // glasses (0–8)
  medications: { pill: boolean; other: string } | null
  skin: string | null
  migraine: boolean | null
  flowIntensity: string | null
}

interface SymptomState {
  logs: SymptomEntry[]
  addLog: (entry: Omit<SymptomEntry, 'id'>) => void
  updateTodayLog: (phase: SymptomEntry['phase'], update: Partial<SymptomEntry>) => void
  updateLog: (date: string, phase: SymptomEntry['phase'], update: Partial<SymptomEntry>) => void
  deleteLog: (date: string) => void
  getTodayLog: () => SymptomEntry | null
  getLogForDate: (date: string) => SymptomEntry | null
  getLogsByPhase: (phase: string) => SymptomEntry[]
  getStreak: () => number
}

export const useSymptomStore = create<SymptomState>()(
  persist(
    (set, get) => ({
      logs: [],
      addLog: (entry) =>
        set((s) => ({ logs: [...s.logs, { ...entry, id: Date.now().toString() }] })),
      updateTodayLog: (phase, update) => {
        const today = new Date().toISOString().split('T')[0]
        set((s) => {
          const idx = s.logs.findIndex((l) => l.date === today)
          if (idx >= 0) {
            const updated = [...s.logs]
            updated[idx] = { ...updated[idx], ...update }
            return { logs: updated }
          }
          return {
            logs: [
              ...s.logs,
              {
                id: Date.now().toString(),
                date: today,
                phase,
                mood: null,
                energy: null,
                symptoms: [],
                bbt: null,
                mucus: null,
                notes: '',
                intimacy: null,
                sleep: null,
                weight: null,
                water: null,
                medications: null,
                ...update,
              },
            ],
          }
        })
      },
      updateLog: (date, phase, update) => {
        set((s) => {
          const idx = s.logs.findIndex((l) => l.date === date)
          if (idx >= 0) {
            const updated = [...s.logs]
            updated[idx] = { ...updated[idx], ...update }
            return { logs: updated }
          }
          return {
            logs: [
              ...s.logs,
              {
                id: Date.now().toString(),
                date,
                phase,
                mood: null, energy: null, symptoms: [], bbt: null,
                mucus: null, notes: '', intimacy: null, sleep: null,
                weight: null, water: null, medications: null,
                ...update,
              },
            ],
          }
        })
      },
      deleteLog: (date) => set((s) => ({ logs: s.logs.filter((l) => l.date !== date) })),
      getTodayLog: () => {
        const today = new Date().toISOString().split('T')[0]
        return get().logs.find((l) => l.date === today) ?? null
      },
      getLogForDate: (date) => get().logs.find((l) => l.date === date) ?? null,
      getLogsByPhase: (phase) => get().logs.filter((l) => l.phase === phase),
      getStreak: () => {
        const logs = get().logs
        const dateSet = new Set(logs.map((l) => l.date))
        let streak = 0
        const today = new Date()
        for (let i = 0; i < 365; i++) {
          const d = new Date(today)
          d.setDate(d.getDate() - i)
          const dateStr = d.toISOString().split('T')[0]
          if (dateSet.has(dateStr)) {
            streak++
          } else if (i > 0) {
            break
          }
        }
        return streak
      },
    }),
    { name: 'symptoms', storage: createJSONStorage(() => mmkvStorage) }
  )
)

// ─── App Settings Store ───────────────────────────────────────
export interface ContraceptiveConfig {
  method: string | null
  pillHour: number
  reminderEnabled: boolean
  startDate: string | null
}

interface SettingsState {
  theme: 'light' | 'dark' | 'auto'
  locale: string
  useMascot: boolean
  notificationsEnabled: boolean
  hasSeenOnboarding: boolean
  ttcMode: boolean
  avatarId: string
  avatarUri: string | null
  unlockedAvatars: string[]
  partnerMode: boolean
  partnerName: string
  // Security
  pinEnabled: boolean
  pinCode: string | null
  biometricEnabled: boolean
  // Pregnancy
  pregnancyMode: boolean
  pregnancyStartDate: string | null
  // Contraceptive
  contraceptive: ContraceptiveConfig | null
  // Language
  language: string | null
  setLanguage: (lang: string) => void
  // PCOS
  pcosMode: boolean
  setPcosMode: (v: boolean) => void
  // Privacy
  hasSeenPrivacyConsent: boolean
  setHasSeenPrivacyConsent: (v: boolean) => void
  // First period
  isFirstPeriod: boolean | null
  setIsFirstPeriod: (v: boolean | null) => void
  // Notification fine-grained settings
  pillReminderEnabled: boolean
  waterReminderEnabled: boolean
  logReminderHour: number
  pillReminderHour: number
  setPillReminderEnabled: (v: boolean) => void
  setWaterReminderEnabled: (v: boolean) => void
  setLogReminderHour: (h: number) => void
  setPillReminderHour: (h: number) => void
  setTheme: (theme: SettingsState['theme']) => void
  setLocale: (locale: string) => void
  setUseMascot: (v: boolean) => void
  setHasSeenOnboarding: (v: boolean) => void
  setTtcMode: (v: boolean) => void
  setAvatarId: (id: string) => void
  setAvatarUri: (uri: string | null) => void
  unlockAvatar: (id: string) => void
  setNotificationsEnabled: (v: boolean) => void
  setPartnerMode: (v: boolean) => void
  setPartnerName: (name: string) => void
  setPinEnabled: (v: boolean) => void
  setPinCode: (code: string | null) => void
  setBiometricEnabled: (v: boolean) => void
  setPregnancyMode: (v: boolean) => void
  setPregnancyStartDate: (date: string | null) => void
  setContraceptive: (config: ContraceptiveConfig) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      locale: 'es',
      useMascot: true,
      notificationsEnabled: false,
      hasSeenOnboarding: false,
      ttcMode: false,
      avatarId: 'luna_nueva',
      avatarUri: null,
      unlockedAvatars: [],
      partnerMode: false,
      partnerName: '',
      pinEnabled: false,
      pinCode: null,
      biometricEnabled: false,
      pregnancyMode: false,
      pregnancyStartDate: null,
      contraceptive: null,
      language: null,
      pcosMode: false,
      hasSeenPrivacyConsent: false,
      isFirstPeriod: null,
      pillReminderEnabled: false,
      waterReminderEnabled: false,
      logReminderHour: 20,
      pillReminderHour: 9,
      setTheme: (theme) => set({ theme }),
      setLocale: (locale) => set({ locale }),
      setUseMascot: (useMascot) => set({ useMascot }),
      setHasSeenOnboarding: (hasSeenOnboarding) => set({ hasSeenOnboarding }),
      setTtcMode: (ttcMode) => set({ ttcMode }),
      setAvatarId: (avatarId) => set({ avatarId, avatarUri: null }),
      setAvatarUri: (avatarUri) => set({ avatarUri }),
      unlockAvatar: (id) => set((s) => ({ unlockedAvatars: [...s.unlockedAvatars, id] })),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setPartnerMode: (partnerMode) => set({ partnerMode }),
      setPartnerName: (partnerName) => set({ partnerName }),
      setLanguage: (language) => set({ language }),
      setPinEnabled: (pinEnabled) => set({ pinEnabled }),
      setPinCode: (pinCode) => set({ pinCode }),
      setBiometricEnabled: (biometricEnabled) => set({ biometricEnabled }),
      setPregnancyMode: (pregnancyMode) => set({ pregnancyMode }),
      setPregnancyStartDate: (pregnancyStartDate) => set({ pregnancyStartDate }),
      setContraceptive: (contraceptive) => set({ contraceptive }),
      setPcosMode: (pcosMode) => set({ pcosMode }),
      setPillReminderEnabled: (pillReminderEnabled) => set({ pillReminderEnabled }),
      setWaterReminderEnabled: (waterReminderEnabled) => set({ waterReminderEnabled }),
      setLogReminderHour: (logReminderHour) => set({ logReminderHour }),
      setPillReminderHour: (pillReminderHour) => set({ pillReminderHour }),
      setHasSeenPrivacyConsent: (hasSeenPrivacyConsent) => set({ hasSeenPrivacyConsent }),
      setIsFirstPeriod: (isFirstPeriod) => set({ isFirstPeriod }),
    }),
    {
      name: 'settings',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
)
