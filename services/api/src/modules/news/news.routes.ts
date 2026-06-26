import { FastifyInstance } from 'fastify'
import { authenticate } from '@/middleware/auth.middleware'
import { NewsService } from './news.service'

const svc = new NewsService()

export async function newsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  // GET /news/feed — RSS + artículos propios
  app.get('/feed', async (_req, reply) => {
    const data = await svc.getNewsFeed()
    return reply.send(data)
  })

  // GET /news/articles/:id — detalle de artículo
  app.get('/articles/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const article = await svc.getArticle(id)
    return reply.send(article)
  })
}
