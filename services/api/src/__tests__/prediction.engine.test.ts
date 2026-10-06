import { describe, it, expect } from '@jest/globals'
import { PredictionEngine } from '../modules/predictions/prediction.engine'

// Fechas fijas para que las pruebas no dependan del día en que se corren.
const d = (iso: string) => new Date(`${iso}T12:00:00`)
const day = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}
const starts = (...isoDates: string[]) => isoDates.map((iso) => ({ startDate: d(iso) }))
const regular28 = starts('2026-10-01', '2026-09-03', '2026-08-06', '2026-07-09')

describe('PredictionEngine', () => {
  it('predice el próximo período sumando el largo promedio al último inicio', () => {
    const p = PredictionEngine.predict(regular28, 5, d('2026-10-05'))
    expect(p.averageCycleLength).toBeCloseTo(28)
    expect(day(p.predictedStartDate)).toBe('2026-10-29')
    expect(day(p.predictedEndDate)).toBe('2026-11-02')
  })

  it('la ovulación es la del ciclo en curso si todavía no pasó', () => {
    // Ciclo de 28 días desde el 1/10 → ovulación el día 14 = 14/10 (no en noviembre)
    const p = PredictionEngine.predict(regular28, 5, d('2026-10-05'))
    expect(day(p.ovulationDate)).toBe('2026-10-14')
    expect(day(p.fertilityWindowStart)).toBe('2026-10-09')
    expect(day(p.fertilityWindowEnd)).toBe('2026-10-15')
  })

  it('si la ovulación del ciclo en curso ya pasó, muestra la del próximo ciclo', () => {
    const p = PredictionEngine.predict(regular28, 5, d('2026-10-20'))
    expect(day(p.ovulationDate)).toBe('2026-11-11')
    expect(day(p.predictedStartDate)).toBe('2026-10-29')
  })

  it('si no registró períodos, la predicción avanza y nunca queda en el pasado', () => {
    // Último registro el 1/10, hoy es 15/12: pasaron dos ciclos sin registrar
    const p = PredictionEngine.predict(regular28, 5, d('2026-12-15'))
    expect(p.predictedStartDate.getTime()).toBeGreaterThan(d('2026-12-15').getTime())
    expect(day(p.predictedStartDate)).toBe('2026-12-24')
  })

  it('da más peso a los ciclos recientes', () => {
    // Último ciclo 32 días, los anteriores 28 → promedio entre 28 y 32, más cerca de 32
    const p = PredictionEngine.predict(starts('2026-10-01', '2026-08-30', '2026-08-02', '2026-07-05'), 5, d('2026-10-05'))
    expect(p.averageCycleLength).toBeGreaterThan(29.5)
    expect(p.averageCycleLength).toBeLessThan(32)
  })

  it('ciclos regulares tienen más confianza que irregulares', () => {
    const irregular = starts('2026-10-01', '2026-08-27', '2026-08-04', '2026-07-01')
    const reg = PredictionEngine.predict(regular28, 5, d('2026-10-05'))
    const irr = PredictionEngine.predict(irregular, 5, d('2026-10-05'))
    expect(reg.irregularityScore).toBe(0)
    expect(irr.irregularityScore).toBeGreaterThan(0)
    expect(reg.confidence).toBeGreaterThan(irr.confidence)
    expect(reg.confidence).toBeLessThanOrEqual(1)
  })

  it('ignora largos imposibles (menos de 21 o más de 45 días)', () => {
    const p = PredictionEngine.predict(starts('2026-10-01', '2026-09-25', '2026-08-28'), 5, d('2026-10-05'))
    expect(p.averageCycleLength).toBeGreaterThanOrEqual(21)
    expect(p.averageCycleLength).toBeLessThanOrEqual(45)
  })

  it('sin datos usa valores por defecto con confianza baja', () => {
    const p = PredictionEngine.predict([], 5, d('2026-10-05'))
    expect(p.cyclesAnalyzed).toBe(0)
    expect(p.confidence).toBeLessThan(0.5)
    expect(day(p.predictedStartDate)).toBe('2026-11-02')
  })

  it('las fases diarias van en orden y el pico de fertilidad cae en la ovulación', () => {
    const p = PredictionEngine.predict(regular28, 5, d('2026-10-05'))
    const phases = p.dailyFertilityScores.map((s) => s.phase)
    expect(phases[0]).toBe('menstrual')
    expect(phases[phases.length - 1]).toBe('luteal')
    const order = ['menstrual', 'follicular', 'ovulatory', 'luteal']
    for (let i = 1; i < phases.length; i++) {
      expect(order.indexOf(phases[i])).toBeGreaterThanOrEqual(order.indexOf(phases[i - 1]))
    }
    const max = Math.max(...p.dailyFertilityScores.map((s) => s.score))
    expect(p.dailyFertilityScores.find((s) => s.score === max)?.date).toBe(day(p.ovulationDate))
  })
})
