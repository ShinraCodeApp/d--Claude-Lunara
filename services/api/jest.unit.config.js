const base = require('./jest.config')
module.exports = { ...base, globalSetup: undefined, globalTeardown: undefined, coverageThreshold: undefined, testMatch: ['**/__tests__/**/*.unit.test.ts', '**/__tests__/prediction.engine.test.ts'] }
