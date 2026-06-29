import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import apiClient from '../client'
import { useCycleStore } from '@/store'

export const CYCLE_KEYS = {
  all: ['cycles'] as const,
  current: () => [...CYCLE_KEYS.all, 'current'] as const,
  calendar: (year: number, month: number) => [...CYCLE_KEYS.all, 'calendar', year, month] as const,
  stats: () => [...CYCLE_KEYS.all, 'stats'] as const,
  list: (page: number) => [...CYCLE_KEYS.all, 'list', page] as const,
}

// Get current cycle state
export function useCurrentCycle() {
  const setCycle = useCycleStore((s) => s.setCurrentCycle)

  return useQuery({
    queryKey: CYCLE_KEYS.current(),
    queryFn: async () => {
      const { data } = await apiClient.get('/cycles/current')
      if (data.prediction) {
        setCycle({
          currentCycleId: data.activeCycle?.id ?? null,
          currentPhase: data.phase,
          dayOfCycle: data.dayOfCycle,
          nextPeriodDate: data.prediction.predictedStartDate,
          nextOvulationDate: data.prediction.ovulationDate,
          fertileWindowStart: data.prediction.fertilityWindowStart,
          fertileWindowEnd: data.prediction.fertilityWindowEnd,
          predictionConfidence: data.prediction.confidence,
          isInPeriod: !!data.activeCycle,
        })
      }
      return data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  })
}

// Get calendar data
export function useCalendar(year: number, month: number) {
  return useQuery({
    queryKey: CYCLE_KEYS.calendar(year, month),
    queryFn: async () => {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 8000)
      try {
        const { data } = await apiClient.get('/cycles/calendar', {
          params: { year, month },
          signal: controller.signal,
        })
        return data
      } finally {
        clearTimeout(timer)
      }
    },
    staleTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: 1,
  })
}

// Get cycle statistics
export function useCycleStats() {
  return useQuery({
    queryKey: CYCLE_KEYS.stats(),
    queryFn: async () => {
      const { data } = await apiClient.get('/cycles/stats')
      return data
    },
    staleTime: 30 * 60 * 1000,
  })
}

// Start period
export function useStartPeriod() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { startDate: string; notes?: string }) => {
      const response = await apiClient.post('/cycles', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CYCLE_KEYS.all })
    },
  })
}

// End period
export function useEndPeriod() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, endDate, notes }: { id: string; endDate: string; notes?: string }) => {
      const response = await apiClient.put(`/cycles/${id}/end`, { endDate, notes })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CYCLE_KEYS.all })
    },
  })
}

// Log bleeding
export function useLogBleeding() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      cycleId, date, intensity, notes,
    }: { cycleId: string; date: string; intensity: string; notes?: string }) => {
      const response = await apiClient.post(`/cycles/${cycleId}/bleeding`, { date, intensity, notes })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CYCLE_KEYS.current() })
    },
  })
}
