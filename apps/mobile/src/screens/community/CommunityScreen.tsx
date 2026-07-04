import React, { useState, useCallback, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, TextInput, Modal, KeyboardAvoidingView,
  Platform, ActivityIndicator, RefreshControl, Linking, ScrollView,
} from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { router } from 'expo-router'
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/es'

import { MMKV } from 'react-native-mmkv'
import { useCycleStore } from '@/store'
import apiClient from '@/api/client'
import { Colors, Typography, Spacing, BorderRadius } from '@/theme'

const communityStorage = new MMKV({ id: 'lunara-community' })

dayjs.extend(relativeTime)
dayjs.locale('es')

type MainTab = 'comunidad' | 'noticias'
type Category = 'all' | 'general' | 'tip' | 'question' | 'support'

interface CommunityPost {
  id: string
  content: string
  phase: string | null
  category: string
  isAnonymous: boolean
  likesCount: number
  hugsCount: number
  isPinned: boolean
  createdAt: string
  authorName: string
  authorAvatar: string | null
  myReactions: string[]
}

interface RssItem {
  title: string
  excerpt: string
  url: string
  imageUrl?: string
  source: string
  publishedAt: string
  category: string
}

interface Article {
  id: string
  title: string
  excerpt: string
  content?: string
  imageUrl?: string
  category: string
  isPinned: boolean
  publishedAt: string
}

interface NewsFeed {
  rss: RssItem[]
  articles: Article[]
}

const CATEGORY_LABELS: Record<Category, string> = {
  all: '✨ Todo',
  general: '💬 General',
  tip: '💡 Consejos',
  question: '❓ Preguntas',
  support: '🤗 Apoyo',
}

const PHASE_EMOJI: Record<string, string> = {
  menstrual: '🩸',
  follicular: '🌱',
  ovulatory: '🌕',
  luteal: '🌘',
}

const DEV_SEED_POSTS: CommunityPost[] = [
  { id: 'seed-1', content: '¿Alguien más siente muchísimo cansancio en la fase lútea? Yo no puedo ni salir de la cama los últimos 3 días antes de mi período 😔', phase: 'luteal', category: 'question', isAnonymous: true, likesCount: 24, hugsCount: 18, isPinned: false, createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), authorName: 'Lunara Anónima', authorAvatar: null, myReactions: [] },
  { id: 'seed-2', content: '✨ Tip que me cambió la vida: tomar magnesio glicinato (400mg) 2 semanas antes del período. Reducí mis cólicos un 80%. Lo comparto porque a mí me costó años descubrirlo.', phase: 'luteal', category: 'tip', isAnonymous: false, likesCount: 87, hugsCount: 43, isPinned: true, createdAt: new Date(Date.now() - 3600000 * 24).toISOString(), authorName: 'María L.', authorAvatar: null, myReactions: ['like'] },
  { id: 'seed-3', content: 'Acabo de confirmar mi ovulación con el BBT y el moco cervical por primera vez después de 8 meses intentándolo. Si están intentando concebir y no lo han probado, ¡los dos métodos juntos funcionan increíble! 🎉', phase: 'ovulatory', category: 'general', isAnonymous: true, likesCount: 56, hugsCount: 31, isPinned: false, createdAt: new Date(Date.now() - 3600000 * 48).toISOString(), authorName: 'Lunara Anónima', authorAvatar: null, myReactions: [] },
  { id: 'seed-4', content: 'Hoy me diagnosticaron SOP. Estoy asustada y no sé por dónde empezar. ¿Alguien ha pasado por esto? Cualquier experiencia me ayuda mucho 💜', phase: null, category: 'support', isAnonymous: true, likesCount: 12, hugsCount: 67, isPinned: false, createdAt: new Date(Date.now() - 3600000 * 6).toISOString(), authorName: 'Lunara Anónima', authorAvatar: null, myReactions: [] },
  { id: 'seed-5', content: 'En la fase folicular me siento imparable 💪 hoy empecé el proyecto que llevaba meses postergando. La energía de esta semana es una locura comparada con la semana pasada.', phase: 'follicular', category: 'general', isAnonymous: false, likesCount: 34, hugsCount: 9, isPinned: false, createdAt: new Date(Date.now() - 3600000 * 72).toISOString(), authorName: 'Valentina R.', authorAvatar: null, myReactions: [] },
]

const DEV_SEED_NEWS: NewsFeed = {
  articles: [
    { id: 'art-1', title: 'Cómo el ciclo menstrual afecta tu energía y productividad', excerpt: 'Entender las fases de tu ciclo te permite planificar mejor tu agenda. Descubrí qué hacer en cada momento del mes para rendir al máximo.', imageUrl: undefined, category: 'ciclo', isPinned: true, publishedAt: new Date(Date.now() - 3600000 * 5).toISOString() },
    { id: 'art-2', title: '5 alimentos que reducen los cólicos menstruales naturalmente', excerpt: 'La dieta tiene un impacto directo en la intensidad del dolor. Incorporá estos alimentos antiinflamatorios en la semana previa a tu período.', imageUrl: undefined, category: 'nutrición', isPinned: false, publishedAt: new Date(Date.now() - 3600000 * 30).toISOString() },
  ],
  rss: [
    { title: 'SOP: síntomas, diagnóstico y tratamientos actuales', excerpt: 'El síndrome de ovario poliquístico afecta a 1 de cada 10 mujeres en edad reproductiva. Conocé las últimas opciones de tratamiento.', url: 'https://www.infosalus.com', imageUrl: undefined, source: 'Infosalus', publishedAt: new Date(Date.now() - 3600000 * 12).toISOString(), category: 'ginecología' },
    { title: 'Endometriosis: nuevas investigaciones abren camino a tratamientos menos invasivos', excerpt: 'Científicos europeos descubren biomarcadores que podrían permitir el diagnóstico de endometriosis sin cirugía.', url: 'https://www.webconsultas.com', imageUrl: undefined, source: 'Webconsultas', publishedAt: new Date(Date.now() - 3600000 * 24).toISOString(), category: 'ginecología' },
    { title: 'Menopausia y salud cardiovascular: lo que toda mujer debe saber', excerpt: 'El descenso de estrógenos aumenta el riesgo cardíaco. Cardiólogos explican cómo protegerse durante y después de la menopausia.', url: 'https://cuidateplus.marca.com', imageUrl: undefined, source: 'Cuídate Plus', publishedAt: new Date(Date.now() - 3600000 * 36).toISOString(), category: 'salud reproductiva' },
  ],
}

async function fetchPosts({ pageParam, category }: { pageParam: string | undefined; category: Category }) {
  if (__DEV__) {
    await new Promise((r) => setTimeout(r, 400))
    const filtered = category === 'all' ? DEV_SEED_POSTS : DEV_SEED_POSTS.filter((p) => p.category === category)
    return { posts: filtered, nextCursor: null }
  }
  const params: Record<string, string> = {}
  if (category !== 'all') params.category = category
  if (pageParam) params.cursor = pageParam
  const { data } = await apiClient.get('/community/posts', { params })
  return data as { posts: CommunityPost[]; nextCursor: string | null }
}

async function fetchNewsFeed(): Promise<NewsFeed> {
  if (__DEV__) {
    await new Promise((r) => setTimeout(r, 600))
    return DEV_SEED_NEWS
  }
  const { data } = await apiClient.get('/news/feed')
  return data as NewsFeed
}

export default function CommunityScreen() {
  const insets = useSafeAreaInsets()
  const cycleStore = useCycleStore()
  const queryClient = useQueryClient()

  const [mainTab, setMainTab] = useState<MainTab>('comunidad')
  const [hasNewNews, setHasNewNews] = useState(() => {
    const last = communityStorage.getNumber('newsLastViewed') ?? 0
    return Date.now() - last > 6 * 60 * 60 * 1000 // badge if not viewed in last 6h
  })
  const [category, setCategory] = useState<Category>('all')
  const [showCompose, setShowCompose] = useState(false)
  const [composeText, setComposeText] = useState('')
  const [composeCategory, setComposeCategory] = useState<'general' | 'tip' | 'question' | 'support'>('general')
  const [isAnonymous, setIsAnonymous] = useState(true)
  const [localReactions, setLocalReactions] = useState<Record<string, string[]>>({})
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)

  const {
    data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch, isRefetching, isError,
  } = useInfiniteQuery({
    queryKey: ['community-posts', category],
    queryFn: ({ pageParam }) => fetchPosts({ pageParam: pageParam as string | undefined, category }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialPageParam: undefined,
    enabled: mainTab === 'comunidad',
  })

  const {
    data: newsData,
    isLoading: newsLoading,
    isError: newsError,
    refetch: newsRefetch,
    isRefetching: newsRefetching,
  } = useQuery({
    queryKey: ['news-feed'],
    queryFn: fetchNewsFeed,
    staleTime: 30 * 60 * 1000,
    enabled: mainTab === 'noticias',
  })

  const posts: CommunityPost[] = data?.pages.flatMap((p) => p.posts) ?? []

  const createMutation = useMutation({
    mutationFn: async (body: { content: string; category: string; isAnonymous: boolean; phase?: string }) => {
      if (__DEV__) {
        await new Promise((r) => setTimeout(r, 500))
        return
      }
      await apiClient.post('/community/posts', body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-posts'] })
      setShowCompose(false)
      setComposeText('')
    },
  })

  const handleReact = useCallback(async (postId: string, type: 'like' | 'hug') => {
    setLocalReactions((prev) => {
      const current = prev[postId] ?? []
      return { ...prev, [postId]: current.includes(type) ? current.filter((r) => r !== type) : [...current, type] }
    })
    if (!__DEV__) {
      try { await apiClient.post(`/community/posts/${postId}/react`, { type }) } catch (e) {
        console.warn('[Community] react sync failed:', e)
      }
    }
  }, [])

  const handleCreate = useCallback(() => {
    if (!composeText.trim()) return
    createMutation.mutate({
      content: composeText.trim(),
      category: composeCategory,
      isAnonymous,
      phase: cycleStore.currentPhase ?? undefined,
    })
  }, [composeText, composeCategory, isAnonymous, cycleStore.currentPhase, createMutation])

  const handleOpenRss = useCallback((url: string) => {
    Linking.openURL(url).catch(() => null)
  }, [])

  const renderPost = useCallback(({ item, index }: { item: CommunityPost; index: number }) => {
    const reactions = localReactions[item.id] ?? item.myReactions
    const liked = reactions.includes('like')
    const hugged = reactions.includes('hug')

    return (
      <Animated.View entering={FadeInDown.delay(index * 40)}>
        <View style={[styles.postCard, item.isPinned && styles.pinnedCard, (item as any).isOfficial && styles.officialCard]}>
          {(item as any).isOfficial && <Text style={styles.officialBadge}>💜 Lunara Oficial</Text>}
          {item.isPinned && !(item as any).isOfficial && <Text style={styles.pinnedBadge}>📌 Destacado</Text>}
          <View style={styles.postHeader}>
            <View style={[(item as any).isOfficial ? styles.officialAvatar : styles.avatarCircle]}>
              <Text style={styles.avatarText}>{(item as any).isOfficial ? '🌙' : item.isAnonymous ? '🌙' : (item.authorName?.[0] ?? '?')}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.authorName}>{item.authorName}</Text>
              <View style={styles.metaRow}>
                {item.phase && <Text style={styles.phaseTag}>{PHASE_EMOJI[item.phase] ?? ''} {item.phase}</Text>}
                <Text style={styles.timeAgo}>{dayjs(item.createdAt).fromNow()}</Text>
              </View>
            </View>
            <View style={[styles.categoryBadge, { backgroundColor: CATEGORY_COLORS[item.category] ?? '#4c1d95' }]}>
              <Text style={styles.categoryBadgeText}>{CATEGORY_ICON[item.category] ?? '💬'}</Text>
            </View>
          </View>
          <Text style={styles.postContent}>{item.content}</Text>
          <View style={styles.reactRow}>
            <TouchableOpacity style={[styles.reactBtn, liked && styles.reactBtnActive]} onPress={() => handleReact(item.id, 'like')}>
              <Text style={styles.reactIcon}>❤️</Text>
              <Text style={[styles.reactCount, liked && styles.reactCountActive]}>
                {item.likesCount + (liked === item.myReactions.includes('like') ? 0 : liked ? 1 : -1)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.reactBtn, hugged && styles.reactBtnActive]} onPress={() => handleReact(item.id, 'hug')}>
              <Text style={styles.reactIcon}>🤗</Text>
              <Text style={[styles.reactCount, hugged && styles.reactCountActive]}>
                {item.hugsCount + (hugged === item.myReactions.includes('hug') ? 0 : hugged ? 1 : -1)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    )
  }, [localReactions, handleReact])

  const renderArticleCard = useCallback((item: Article, index: number) => (
    <Animated.View key={item.id} entering={FadeInDown.delay(index * 50)}>
      <TouchableOpacity style={[styles.newsCard, item.isPinned && styles.pinnedCard]} onPress={() => setSelectedArticle(item)}>
        {item.isPinned && <Text style={styles.pinnedBadge}>📌 Lunara</Text>}
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.newsImage} contentFit="cover" />
        ) : (
          <View style={styles.newsImagePlaceholder}>
            <Text style={{ fontSize: 32 }}>🌸</Text>
          </View>
        )}
        <View style={styles.newsBody}>
          <View style={styles.newsSourceRow}>
            <View style={styles.newsSourceBadge}>
              <Text style={styles.newsSourceText}>Lunara</Text>
            </View>
            <Text style={styles.newsDate}>{dayjs(item.publishedAt).fromNow()}</Text>
          </View>
          <Text style={styles.newsTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.newsExcerpt} numberOfLines={2}>{item.excerpt}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  ), [])

  const renderRssCard = useCallback((item: RssItem, index: number) => (
    <Animated.View key={`rss-${item.url}-${index}`} entering={FadeInDown.delay(index * 50)}>
      <TouchableOpacity style={styles.newsCard} onPress={() => handleOpenRss(item.url)}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.newsImage} contentFit="cover" />
        ) : (
          <View style={styles.newsImagePlaceholder}>
            <Text style={{ fontSize: 32 }}>📰</Text>
          </View>
        )}
        <View style={styles.newsBody}>
          <View style={styles.newsSourceRow}>
            <View style={[styles.newsSourceBadge, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
              <Text style={styles.newsSourceText}>{item.source}</Text>
            </View>
            <Text style={styles.newsDate}>{dayjs(item.publishedAt).fromNow()}</Text>
          </View>
          <Text style={styles.newsTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.newsExcerpt} numberOfLines={2}>{item.excerpt}</Text>
          <Text style={styles.newsOpenLink}>Abrir artículo →</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  ), [handleOpenRss])

  const renderNewsTab = () => {
    if (newsLoading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.lavender[400]} size="large" />
          <Text style={styles.loadingText}>Cargando noticias...</Text>
        </View>
      )
    }
    if (newsError) {
      return (
        <View style={styles.centered}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>😔</Text>
          <Text style={[styles.loadingText, { color: '#fff', fontSize: 16, marginBottom: 8 }]}>No se pudieron cargar las noticias</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => newsRefetch()}>
            <Text style={styles.retryBtnText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )
    }

    const articles = newsData?.articles ?? []
    const rss = newsData?.rss ?? []
    const totalItems = articles.length + rss.length

    return (
      <ScrollView
        contentContainerStyle={[styles.newsFeed, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={newsRefetching} onRefresh={() => newsRefetch()} tintColor={Colors.lavender[400]} />
        }
      >
        {articles.length > 0 && (
          <>
            <Text style={styles.newsSectionTitle}>✨ De Lunara</Text>
            {articles.map((a, i) => renderArticleCard(a, i))}
            {rss.length > 0 && <View style={styles.newsDivider} />}
          </>
        )}
        {rss.length > 0 && (
          <>
            <Text style={styles.newsSectionTitle}>📰 Noticias de salud femenina</Text>
            {rss.map((item, i) => renderRssCard(item, articles.length + i))}
          </>
        )}
        {totalItems === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyTitle}>Sin noticias disponibles</Text>
            <Text style={styles.emptyBody}>Volvé a intentar más tarde.</Text>
          </View>
        )}
      </ScrollView>
    )
  }

  return (
    <LinearGradient colors={['#0d0118', '#1a0533']} style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>🤝 Comunidad</Text>
          <Text style={styles.subtitle}>Anónimo · Sin juicios · Solo apoyo</Text>
        </View>
        {mainTab === 'comunidad' && (
          <TouchableOpacity style={styles.composeBtn} onPress={() => setShowCompose(true)}>
            <Text style={styles.composeBtnText}>+ Compartir</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Main tab switcher */}
      <View style={styles.mainTabBar}>
        <TouchableOpacity
          style={[styles.mainTabBtn, mainTab === 'comunidad' && styles.mainTabBtnActive]}
          onPress={() => setMainTab('comunidad')}
        >
          <Text style={[styles.mainTabText, mainTab === 'comunidad' && styles.mainTabTextActive]}>💬 Comunidad</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.mainTabBtn, mainTab === 'noticias' && styles.mainTabBtnActive]}
          onPress={() => {
            setMainTab('noticias')
            if (hasNewNews) {
              setHasNewNews(false)
              communityStorage.set('newsLastViewed', Date.now())
            }
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.mainTabText, mainTab === 'noticias' && styles.mainTabTextActive]}>📰 Noticias</Text>
            {hasNewNews && <View style={styles.newsBadge} />}
          </View>
        </TouchableOpacity>
      </View>

      {mainTab === 'comunidad' ? (
        <>
          {/* Category filter */}
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={Object.entries(CATEGORY_LABELS) as [Category, string][]}
            keyExtractor={([k]) => k}
            contentContainerStyle={styles.filterList}
            renderItem={({ item: [key, label] }) => (
              <TouchableOpacity
                style={[styles.filterChip, category === key && styles.filterChipActive]}
                onPress={() => setCategory(key)}
              >
                <Text style={[styles.filterText, category === key && styles.filterTextActive]}>{label}</Text>
              </TouchableOpacity>
            )}
          />

          {/* Posts feed */}
          {isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={Colors.lavender[400]} size="large" />
              <Text style={styles.loadingText}>Cargando comunidad...</Text>
            </View>
          ) : isError ? (
            <View style={styles.centered}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>😔</Text>
              <Text style={[styles.loadingText, { color: '#fff', fontSize: 16, marginBottom: 8 }]}>No se pudo cargar la comunidad</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
                <Text style={styles.retryBtnText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={posts}
              keyExtractor={(item) => item.id}
              renderItem={renderPost}
              contentContainerStyle={[styles.feed, { paddingBottom: insets.bottom + 24 }]}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.lavender[400]} />}
              onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage() }}
              onEndReachedThreshold={0.3}
              ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={Colors.lavender[400]} style={{ padding: 16 }} /> : null}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>🌙</Text>
                  <Text style={styles.emptyTitle}>Sé la primera en compartir</Text>
                  <Text style={styles.emptyBody}>La comunidad está esperando tu historia, consejo o pregunta.</Text>
                </View>
              }
            />
          )}
        </>
      ) : (
        renderNewsTab()
      )}

      {/* Compose modal */}
      <Modal visible={showCompose} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.composeSheet}>
            <View style={styles.composeHeader}>
              <Text style={styles.composeTitle}>✍️ Compartir en comunidad</Text>
              <TouchableOpacity onPress={() => { setShowCompose(false); setComposeText('') }}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.composeInput}
              value={composeText}
              onChangeText={setComposeText}
              placeholder="Comparte tu experiencia, consejo o pregunta..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              multiline
              maxLength={500}
              autoFocus
            />
            <Text style={styles.charCount}>{composeText.length}/500</Text>
            <View style={styles.composeCatRow}>
              {(['general', 'tip', 'question', 'support'] as const).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.composeCatChip, composeCategory === cat && styles.composeCatChipActive]}
                  onPress={() => setComposeCategory(cat)}
                >
                  <Text style={styles.composeCatText}>{CATEGORY_ICON[cat]} {cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.anonRow} onPress={() => setIsAnonymous(!isAnonymous)}>
              <View style={[styles.anonToggle, isAnonymous && styles.anonToggleOn]}>
                <View style={[styles.anonThumb, isAnonymous && styles.anonThumbOn]} />
              </View>
              <Text style={styles.anonLabel}>{isAnonymous ? '🌙 Anónima' : '👤 Con tu nombre'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, (!composeText.trim() || createMutation.isPending) && styles.submitBtnDisabled]}
              onPress={handleCreate}
              disabled={!composeText.trim() || createMutation.isPending}
            >
              {createMutation.isPending
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.submitBtnText}>Publicar</Text>
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Article detail modal (admin articles) */}
      <Modal visible={!!selectedArticle} animationType="slide" transparent>
        <View style={styles.articleOverlay}>
          <View style={[styles.articleSheet, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.articleSheetHeader}>
              <View style={[styles.newsSourceBadge, { alignSelf: 'flex-start' }]}>
                <Text style={styles.newsSourceText}>Lunara · {selectedArticle?.category}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedArticle(null)} style={styles.articleCloseBtn}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedArticle?.imageUrl ? (
                <Image source={{ uri: selectedArticle.imageUrl }} style={styles.articleImage} contentFit="cover" />
              ) : (
                <View style={styles.articleImagePlaceholder}>
                  <Text style={{ fontSize: 48 }}>🌸</Text>
                </View>
              )}
              <Text style={styles.articleTitle}>{selectedArticle?.title}</Text>
              <Text style={styles.articleDate}>{dayjs(selectedArticle?.publishedAt).format('D MMMM YYYY')}</Text>
              <Text style={styles.articleContent}>{selectedArticle?.content ?? selectedArticle?.excerpt}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  )
}

const CATEGORY_COLORS: Record<string, string> = {
  general: '#4c1d95',
  tip: '#064e3b',
  question: '#1e3a5f',
  support: '#831843',
}

const CATEGORY_ICON: Record<string, string> = {
  general: '💬',
  tip: '💡',
  question: '❓',
  support: '🤗',
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm,
    gap: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  backBtn: { padding: 4 },
  backText: { color: Colors.lavender[300], fontSize: 22 },
  title: { fontSize: Typography.fontSize.xl, fontFamily: Typography.fontFamily.bold, color: '#fff' },
  subtitle: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.4)', marginTop: 1 },
  composeBtn: {
    backgroundColor: Colors.primary[600], borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
  },
  composeBtnText: { color: '#fff', fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.bold },

  // Main tabs
  mainTabBar: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.lg,
    padding: 3,
  },
  mainTabBtn: {
    flex: 1, paddingVertical: 8, alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  mainTabBtnActive: { backgroundColor: Colors.primary[700] },
  mainTabText: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.4)' },
  mainTabTextActive: { color: '#fff', fontFamily: Typography.fontFamily.bold },
  newsBadge: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#f43f5e',
  },

  // Community tab
  filterList: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: 8, alignItems: 'center' },
  filterChip: {
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    borderRadius: BorderRadius.full, backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignSelf: 'flex-start',
  },
  filterChipActive: { backgroundColor: Colors.primary[700], borderColor: Colors.primary[500] },
  filterText: { color: 'rgba(255,255,255,0.5)', fontSize: Typography.fontSize.sm },
  filterTextActive: { color: '#fff', fontFamily: Typography.fontFamily.bold },
  feed: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, gap: Spacing.sm },
  postCard: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: BorderRadius.xl,
    padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    gap: Spacing.sm, marginBottom: 2,
  },
  pinnedCard: { borderColor: 'rgba(168,85,247,0.4)', backgroundColor: 'rgba(139,92,246,0.08)' },
  pinnedBadge: { fontSize: Typography.fontSize.xs, color: Colors.lavender[400] },
  officialCard: { borderColor: 'rgba(139,92,246,0.6)', backgroundColor: 'rgba(109,40,217,0.12)' },
  officialBadge: { fontSize: Typography.fontSize.xs, color: '#a78bfa', fontFamily: Typography.fontFamily.bold, marginBottom: 4 },
  officialAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(109,40,217,0.5)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#7c3aed',
  },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatarCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(139,92,246,0.3)', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 16 },
  authorName: { fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.bold, color: '#fff' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1 },
  phaseTag: { fontSize: 11, color: Colors.lavender[400], textTransform: 'capitalize' },
  timeAgo: { fontSize: 11, color: 'rgba(255,255,255,0.3)' },
  categoryBadge: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  categoryBadgeText: { fontSize: 14 },
  postContent: {
    fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.85)',
    lineHeight: 21, fontFamily: Typography.fontFamily.regular,
  },
  reactRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: 4 },
  reactBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  reactBtnActive: { backgroundColor: 'rgba(139,92,246,0.2)', borderColor: 'rgba(139,92,246,0.4)' },
  reactIcon: { fontSize: 14 },
  reactCount: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.5)' },
  reactCountActive: { color: Colors.lavender[300], fontFamily: Typography.fontFamily.bold },

  // News tab
  newsFeed: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, gap: Spacing.sm },
  newsSectionTitle: {
    fontSize: Typography.fontSize.sm, fontFamily: Typography.fontFamily.bold,
    color: 'rgba(255,255,255,0.5)', marginBottom: 4, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  newsDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginVertical: 8 },
  newsCard: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: BorderRadius.xl,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden', marginBottom: 2,
  },
  newsImage: { width: '100%', height: 140 },
  newsImagePlaceholder: {
    width: '100%', height: 100,
    backgroundColor: 'rgba(139,92,246,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  newsBody: { padding: Spacing.md, gap: 4 },
  newsSourceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  newsSourceBadge: {
    backgroundColor: 'rgba(139,92,246,0.25)', borderRadius: BorderRadius.sm,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  newsSourceText: { fontSize: 11, color: Colors.lavender[300], fontFamily: Typography.fontFamily.bold },
  newsDate: { fontSize: 11, color: 'rgba(255,255,255,0.3)' },
  newsTitle: {
    fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.bold,
    color: '#fff', lineHeight: 22,
  },
  newsExcerpt: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.55)', lineHeight: 19 },
  newsOpenLink: { fontSize: Typography.fontSize.xs, color: Colors.lavender[400], marginTop: 4 },

  // Shared
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: 'rgba(255,255,255,0.4)', fontSize: Typography.fontSize.sm },
  retryBtn: {
    marginTop: 8, backgroundColor: Colors.primary[600],
    borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10,
  },
  retryBtnText: { color: '#fff', fontWeight: 'bold' },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: Typography.fontSize.lg, fontFamily: Typography.fontFamily.bold, color: '#fff' },
  emptyBody: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.4)', textAlign: 'center' },

  // Compose modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  composeSheet: {
    backgroundColor: '#1a0533', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.lg, gap: Spacing.md,
    borderTopWidth: 1, borderColor: 'rgba(139,92,246,0.3)',
  },
  composeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  composeTitle: { fontSize: Typography.fontSize.md, fontFamily: Typography.fontFamily.bold, color: '#fff' },
  closeBtn: { color: 'rgba(255,255,255,0.5)', fontSize: 20, padding: 4 },
  composeInput: {
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: BorderRadius.lg,
    padding: Spacing.md, color: '#fff', fontSize: Typography.fontSize.base,
    minHeight: 120, textAlignVertical: 'top',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    fontFamily: Typography.fontFamily.regular,
  },
  charCount: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.3)', alignSelf: 'flex-end', marginTop: -8 },
  composeCatRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  composeCatChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  composeCatChipActive: { backgroundColor: Colors.primary[700], borderColor: Colors.primary[500] },
  composeCatText: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.7)' },
  anonRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  anonToggle: { width: 44, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', padding: 2, justifyContent: 'center' },
  anonToggleOn: { backgroundColor: Colors.primary[600] },
  anonThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.4)' },
  anonThumbOn: { backgroundColor: '#fff', alignSelf: 'flex-end' },
  anonLabel: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.7)' },
  submitBtn: { backgroundColor: Colors.primary[600], borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center' },
  submitBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.1)' },
  submitBtnText: { color: '#fff', fontSize: Typography.fontSize.base, fontFamily: Typography.fontFamily.bold },

  // Article detail modal
  articleOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)' },
  articleSheet: {
    flex: 1, backgroundColor: '#0d0118',
    paddingHorizontal: Spacing.md,
  },
  articleSheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: Spacing.md,
  },
  articleCloseBtn: { padding: 8 },
  articleImage: { width: '100%', height: 200, borderRadius: BorderRadius.lg, marginBottom: Spacing.md },
  articleImagePlaceholder: {
    width: '100%', height: 160, borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(139,92,246,0.1)', alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  articleTitle: {
    fontSize: Typography.fontSize['2xl'], fontFamily: Typography.fontFamily.bold,
    color: '#fff', lineHeight: 30, marginBottom: 8,
  },
  articleDate: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.35)', marginBottom: Spacing.md },
  articleContent: {
    fontSize: Typography.fontSize.base, color: 'rgba(255,255,255,0.8)',
    lineHeight: 26, fontFamily: Typography.fontFamily.regular,
  },
})
