import { prisma } from '@/config/database'

const PAGE_SIZE = 20

export class CommunityService {
  async getPosts(userId: string, category?: string, cursor?: string) {
    const where = {
      ...(category && category !== 'all' ? { category } : {}),
    }

    const posts = await prisma.communityPost.findMany({
      where,
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      take: PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        user: {
          select: {
            profile: { select: { firstName: true, avatarUrl: true } },
          },
        },
        reactions: {
          where: { userId },
          select: { type: true },
        },
      },
    })

    const hasMore = posts.length > PAGE_SIZE
    const items = posts.slice(0, PAGE_SIZE).map((p) => ({
      id: p.id,
      content: p.content,
      phase: p.phase,
      category: p.category,
      isAnonymous: p.isAnonymous,
      likesCount: p.likesCount,
      hugsCount: p.hugsCount,
      isPinned: p.isPinned,
      createdAt: p.createdAt,
      authorName: p.isAnonymous ? 'Lunara Anónima' : (p.user.profile?.firstName ?? 'Usuaria'),
      authorAvatar: p.isAnonymous ? null : p.user.profile?.avatarUrl,
      myReactions: p.reactions.map((r) => r.type),
    }))

    return {
      posts: items,
      nextCursor: hasMore ? items[items.length - 1]?.id : null,
    }
  }

  async createPost(userId: string, data: {
    content: string
    phase?: string
    category: string
    isAnonymous: boolean
  }) {
    const cycle = await prisma.menstrualCycle.findFirst({
      where: { userId },
      orderBy: { startDate: 'desc' },
    })

    return prisma.communityPost.create({
      data: {
        userId,
        content: data.content,
        phase: data.phase ?? null,
        category: data.category,
        isAnonymous: data.isAnonymous,
      },
      select: {
        id: true,
        content: true,
        phase: true,
        category: true,
        isAnonymous: true,
        likesCount: true,
        hugsCount: true,
        createdAt: true,
      },
    })
  }

  async react(userId: string, postId: string, type: 'like' | 'hug' | 'heart') {
    const post = await prisma.communityPost.findUnique({ where: { id: postId } })
    if (!post) throw { statusCode: 404, message: 'Post no encontrado' }

    const existing = await prisma.communityReaction.findUnique({
      where: { postId_userId_type: { postId, userId, type } },
    })

    if (existing) {
      // Toggle off
      await prisma.communityReaction.delete({ where: { id: existing.id } })
      const decrement = type === 'hug' ? { hugsCount: { decrement: 1 } } : { likesCount: { decrement: 1 } }
      await prisma.communityPost.update({ where: { id: postId }, data: decrement })
      return { reacted: false, type }
    }

    await prisma.communityReaction.create({ data: { postId, userId, type } })
    const increment = type === 'hug' ? { hugsCount: { increment: 1 } } : { likesCount: { increment: 1 } }
    await prisma.communityPost.update({ where: { id: postId }, data: increment })
    return { reacted: true, type }
  }

  async deletePost(userId: string, postId: string) {
    const post = await prisma.communityPost.findUnique({ where: { id: postId } })
    if (!post) throw { statusCode: 404, message: 'Post no encontrado' }
    if (post.userId !== userId) throw { statusCode: 403, message: 'Sin permiso' }
    await prisma.communityPost.delete({ where: { id: postId } })
  }
}
