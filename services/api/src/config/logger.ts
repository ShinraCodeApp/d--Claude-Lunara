import { env } from './env'

export const logger = {
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  formatters: {
    level: (label: string) => ({ level: label }),
  },
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  serializers: {
    req: (req: { method: string; url: string; id: string }) => ({
      method: req.method,
      url: req.url,
      id: req.id,
    }),
    res: (res: { statusCode: number }) => ({
      statusCode: res.statusCode,
    }),
  },
}
