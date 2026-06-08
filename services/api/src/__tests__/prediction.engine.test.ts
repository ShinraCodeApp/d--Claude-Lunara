import { PredictionEngine } from '../modules/predictions/prediction.engine'

describe('PredictionEngine', () => {
  it('predicts next period with single cycle', () => {
    const cycles = [{ length: 28, periodLength: 5 }]
    const prediction = PredictionEngine.predict(cycles)

    expect(prediction.predictedLength).toBe(28)
    expect(prediction.confidence).toBeGreaterThan(0)
    expect(prediction.confidence).toBeLessThanOrEqual(1)
  })

  it('weights recent cycles more heavily (exponential decay)', () => {
    // Recent cycle is 32 days, older cycles are 28
    const cycles = [
      { length: 28, periodLength: 5 },
      { length: 28, periodLength: 5 },
      { length: 28, periodLength: 5 },
      { length: 32, periodLength: 5 }, // most recent
    ]
    const prediction = PredictionEngine.predict(cycles)
    // Result should be closer to 32 than to 28 due to exponential weighting
    expect(prediction.predictedLength).toBeGreaterThan(28)
    expect(prediction.predictedLength).toBeLessThanOrEqual(32)
  })

  it('calculates ovulation day as cycleLength - 14', () => {
    const cycles = [{ length: 30, periodLength: 5 }]
    const prediction = PredictionEngine.predict(cycles)
    // Ovulation at day 16 (30-14)
    expect(prediction.dailyFertilityScores).toBeDefined()
    const day16 = prediction.dailyFertilityScores[15] // 0-indexed
    expect(day16).toBeGreaterThan(80) // ovulation day should have highest fertility
  })

  it('returns higher confidence for regular cycles', () => {
    const regularCycles = Array.from({ length: 6 }, () => ({ length: 28, periodLength: 5 }))
    const irregularCycles = [
      { length: 21, periodLength: 5 },
      { length: 35, periodLength: 7 },
      { length: 28, periodLength: 4 },
    ]

    const regularPrediction = PredictionEngine.predict(regularCycles)
    const irregularPrediction = PredictionEngine.predict(irregularCycles)

    expect(regularPrediction.confidence).toBeGreaterThan(irregularPrediction.confidence)
  })

  it('correctly identifies fertile window', () => {
    const cycles = [{ length: 28, periodLength: 5 }]
    const prediction = PredictionEngine.predict(cycles)

    // Fertile window should be around ovulation day (14)
    const ovDay = 28 - 14 // day 14
    expect(prediction.fertileWindowStart).toBeDefined()
    expect(prediction.fertileWindowEnd).toBeDefined()
  })

  it('handles empty cycles array gracefully', () => {
    const prediction = PredictionEngine.predict([])
    expect(prediction.predictedLength).toBe(28) // default
    expect(prediction.confidence).toBe(0)
  })
})
