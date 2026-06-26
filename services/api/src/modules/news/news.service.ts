import { prisma } from '@/config/database'

interface RssItem {
  title: string
  excerpt: string
  url: string
  imageUrl?: string
  source: string
  publishedAt: string
  category: string
}

const RSS_FEEDS = [
  {
    url: 'https://www.infosalus.com/rss/novedades-salud-mujer.xml',
    source: 'Infosalus',
    category: 'salud',
  },
  {
    url: 'https://www.webconsultas.com/category/salud-al-dia/ginecologia/feed',
    source: 'Webconsultas',
    category: 'ginecología',
  },
  {
    url: 'https://cuidateplus.marca.com/reproduccion/feed.xml',
    source: 'Cuídate Plus',
    category: 'salud reproductiva',
  },
  {
    url: 'https://www.topdoctors.es/blog/category/ginecologia-y-obstetricia/feed/',
    source: 'Top Doctors',
    category: 'ginecología',
  },
]

// Simple RSS parser without external dependency
async function parseRssFeed(feedUrl: string, source: string, category: string): Promise<RssItem[]> {
  try {
    const res = await fetch(feedUrl, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Lunara/1.0 RSS Reader' },
    })
    if (!res.ok) return []

    const xml = await res.text()
    const items: RssItem[] = []

    const itemRegex = /<item>([\s\S]*?)<\/item>/gi
    let match
    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[1]
      const title = extractTag(block, 'title')
      const link = extractTag(block, 'link') || extractTag(block, 'guid')
      const desc = extractTag(block, 'description')
      const pubDate = extractTag(block, 'pubDate')
      const image =
        extractAttr(block, 'enclosure', 'url') ||
        extractAttr(block, 'media:content', 'url') ||
        extractAttr(block, 'media:thumbnail', 'url') ||
        extractImgSrc(desc)

      if (!title || !link) continue

      items.push({
        title: stripHtml(title).trim(),
        excerpt: stripHtml(desc).slice(0, 200).trim(),
        url: link.trim(),
        imageUrl: image || undefined,
        source,
        category,
        publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      })
    }

    return items.slice(0, 10)
  } catch {
    return []
  }
}

function extractTag(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i')) ||
            xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return m ? m[1].trim() : ''
}

function extractAttr(xml: string, tag: string, attr: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'i'))
  return m ? m[1] : ''
}

function extractImgSrc(html: string): string {
  const m = html.match(/<img[^>]+src="([^"]+)"/i)
  return m ? m[1] : ''
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
}

// Cache en memoria por 30 minutos
let cachedFeed: RssItem[] = []
let cacheTime = 0
const CACHE_TTL = 30 * 60 * 1000

export class NewsService {
  async getNewsFeed(): Promise<{ rss: RssItem[]; articles: object[] }> {
    const now = Date.now()
    if (now - cacheTime < CACHE_TTL && cachedFeed.length > 0) {
      const articles = await this.getPublishedArticles()
      return { rss: cachedFeed, articles }
    }

    const results = await Promise.allSettled(
      RSS_FEEDS.map((f) => parseRssFeed(f.url, f.source, f.category))
    )

    const items: RssItem[] = []
    for (const r of results) {
      if (r.status === 'fulfilled') items.push(...r.value)
    }

    items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    cachedFeed = items
    cacheTime = now

    const articles = await this.getPublishedArticles()
    return { rss: items, articles }
  }

  async getPublishedArticles() {
    return prisma.article.findMany({
      where: { isPublished: true },
      orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
      select: {
        id: true,
        title: true,
        excerpt: true,
        imageUrl: true,
        category: true,
        isPinned: true,
        publishedAt: true,
      },
      take: 20,
    })
  }

  async createArticle(authorId: string, data: {
    title: string
    excerpt: string
    content: string
    imageUrl?: string
    category?: string
    isPinned?: boolean
    isPublished?: boolean
  }) {
    return prisma.article.create({
      data: { ...data, authorId },
    })
  }

  async updateArticle(id: string, data: Partial<{
    title: string
    excerpt: string
    content: string
    imageUrl: string
    category: string
    isPinned: boolean
    isPublished: boolean
  }>) {
    return prisma.article.update({ where: { id }, data })
  }

  async deleteArticle(id: string) {
    return prisma.article.delete({ where: { id } })
  }

  async getArticle(id: string) {
    return prisma.article.findUniqueOrThrow({ where: { id } })
  }

  async listArticles(page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize
    const [items, total] = await Promise.all([
      prisma.article.findMany({
        orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
        skip,
        take: pageSize,
        include: { author: { select: { profile: { select: { firstName: true } } } } },
      }),
      prisma.article.count(),
    ])
    return { items, total, page, pageSize }
  }
}
