import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '@/middleware/auth.middleware'
import { CommunityService } from './community.service'

const svc = new CommunityService()

export async function communityRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  // GET /community/posts
  app.get('/posts', async (req, reply) => {
    const { category, cursor } = z.object({
      category: z.string().optional(),
      cursor: z.string().optional(),
    }).parse(req.query)

    const result = await svc.getPosts(req.currentUser.id, category, cursor)
    return reply.send(result)
  })

  // POST /community/posts
  app.post('/posts', async (req, reply) => {
    const body = z.object({
      content: z.string().min(1).max(500),
      phase: z.string().optional(),
      category: z.enum(['general', 'tip', 'question', 'support']).default('general'),
      isAnonymous: z.boolean().default(true),
    }).parse(req.body)

    const post = await svc.createPost(req.currentUser.id, body)
    return reply.status(201).send(post)
  })

  // POST /community/posts/:id/react
  app.post('/posts/:id/react', async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const { type } = z.object({
      type: z.enum(['like', 'hug', 'heart']),
    }).parse(req.body)

    const result = await svc.react(req.currentUser.id, id, type)
    return reply.send(result)
  })

  // DELETE /community/posts/:id
  app.delete('/posts/:id', async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    await svc.deletePost(req.currentUser.id, id)
    return reply.status(204).send()
  })
}
