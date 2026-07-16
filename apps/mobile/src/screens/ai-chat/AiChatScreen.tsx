import React, { useState, useRef, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useMutation } from '@tanstack/react-query'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import dayjs from 'dayjs'

import { useAuthStore, useCycleStore, useSymptomStore } from '@/store'
import apiClient from '@/api/client'
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/theme'
import { generateLocalResponse, buildLunaContext } from '@/utils/lunaLocal'

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content: '¡Hola! Soy Luna 🌙, tu asistente de salud femenina. Estoy aquí para ayudarte con preguntas sobre tu ciclo, fertilidad, síntomas y bienestar general.\n\n¿En qué puedo ayudarte hoy?\n\n⚕️ Recuerda que soy una herramienta de apoyo educativo, no reemplazo la consulta con tu médica.',
  timestamp: new Date(),
}

const SUGGESTION_PROMPTS_BY_PHASE: Record<string, string[]> = {
  menstrual: [
    '¿Cómo calmo los cólicos menstruales?',
    '¿Qué alimentos ayudan durante el período?',
    '¿Es normal tener tanto cansancio?',
    '¿Cuánto puede durar el período?',
  ],
  follicular: [
    '¿Cómo aprovechar esta fase de energía?',
    '¿Cuándo se acerca mi ovulación?',
    '¿Qué ejercicio es mejor ahora?',
    '¿Por qué me siento más sociable?',
  ],
  ovulatory: [
    '¿Estoy en mi ventana fértil ahora?',
    '¿Cómo confirmar que ovulé?',
    '¿Qué signos indican ovulación?',
    '¿Cuánto dura la fase ovulatoria?',
  ],
  luteal: [
    '¿Por qué me siento irritable antes del período?',
    '¿Cómo aliviar los síntomas del PMS?',
    '¿Es TDPM o PMS normal?',
    '¿Qué alimentos reducen la retención de líquidos?',
  ],
  default: [
    '¿Qué síntomas son normales en la fase lútea?',
    '¿Cómo calmar los cólicos menstruales?',
    '¿Cuándo es mi ventana fértil?',
    '¿Por qué mi ciclo es irregular?',
  ],
}

export default function AiChatScreen() {
  const insets = useSafeAreaInsets()
  const { user } = useAuthStore()
  const cycleStore = useCycleStore()
  const { logs } = useSymptomStore()
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE])
  const [input, setInput] = useState('')
  const [remainingToday, setRemainingToday] = useState<number | null>(null)
  const [isOffline, setIsOffline] = useState(false)
  const flatListRef = useRef<FlatList>(null)

  const router = useRouter()
  const isPremium = user?.subscription?.isPremium ?? false
  const phase = cycleStore.currentPhase
  const suggestionPrompts = SUGGESTION_PROMPTS_BY_PHASE[phase ?? 'default'] ?? SUGGESTION_PROMPTS_BY_PHASE.default

  const sendMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      const userMsg: Message = {
        id: genId(),
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
      }

      const updatedMessages = [...messages, userMsg]
      setMessages(updatedMessages)

      const last14Logs = logs.slice(-14)
      const { data } = await apiClient.post('/ai/chat', {
        messages: updatedMessages.slice(-10).map((m) => ({
          role: m.role,
          content: m.content,
        })),
        ...(cycleStore.currentPhase ? {
          cycleContext: {
            day_of_cycle: cycleStore.dayOfCycle,
            phase: cycleStore.currentPhase,
            avg_cycle_length: 28,
            next_period: cycleStore.nextPeriodDate,
            next_ovulation: cycleStore.nextOvulationDate,
            user_context: buildLunaContext(cycleStore.currentPhase, cycleStore.dayOfCycle, last14Logs),
          },
        } : {}),
      })

      return { response: data.content, remaining: data.remainingToday, userMsg }
    },
    onSuccess: ({ response, remaining, userMsg }) => {
      const assistantMsg: Message = {
        id: genId(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMsg])
      setRemainingToday(remaining)
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)
    },
    onError: (error: any) => {
      const isRateLimit = error?.response?.status === 429
      if (isRateLimit) {
        const errorMsg: Message = {
          id: genId(),
          role: 'assistant',
          content: `Has alcanzado el límite de mensajes de hoy. Podrás escribirle a Luna nuevamente mañana 🌙${!isPremium ? '\n\n💎 Actualizá a Premium para mensajes ilimitados con Luna.' : ''}`,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, errorMsg])
        return
      }

      // Log error details for debugging
      const status = error?.response?.status
      const errMsg = error?.response?.data?.error ?? error?.response?.data?.message ?? error?.message ?? 'desconocido'
      console.error('[Luna] API error:', status, errMsg, error?.code)

      // Backend offline → generar respuesta local con datos reales del usuario
      setIsOffline(true)
      const lastUserMsg = (sendMutation.variables as string | undefined) ?? ''
      const localResponse = generateLocalResponse(
        lastUserMsg ?? '',
        cycleStore.currentPhase,
        cycleStore.dayOfCycle,
        logs
      )
      const offlineMsg: Message = {
        id: genId(),
        role: 'assistant',
        content: localResponse,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, offlineMsg])
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)
    },
  })

  const handleSend = useCallback(() => {
    if (!input.trim() || sendMutation.isPending) return
    const msg = input.trim()
    setInput('')
    sendMutation.mutate(msg)
  }, [input, sendMutation])

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isUser = item.role === 'user'
    return (
      <Animated.View
        entering={FadeInUp.delay(index * 30)}
        style={[styles.messageWrapper, isUser ? styles.userWrapper : styles.assistantWrapper]}
      >
        {!isUser && <Text style={styles.avatarEmoji}>🌙</Text>}
        <View style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.assistantBubble,
        ]}>
          <Text style={[styles.bubbleText, isUser ? styles.userText : styles.assistantText]}>
            {item.content}
          </Text>
          <Text style={styles.timestamp}>
            {dayjs(item.timestamp).format('HH:mm')}
          </Text>
        </View>
      </Animated.View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={insets.bottom + 60}
    >
      {/* Header */}
      <LinearGradient
        colors={[Colors.dark.surface, Colors.dark.bg]}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🌙 Luna</Text>
        <Text style={styles.headerSubtitle}>
          {isOffline ? 'Modo offline · Respuestas con tus datos locales' : 'Asistente de salud femenina'}
        </Text>
        {isOffline && (
          <Text style={styles.offlineText}>⚡ Sin conexión al servidor — Luna usa tus registros reales</Text>
        )}
        {remainingToday !== null && !isPremium && !isOffline && (
          <Text style={styles.remainingText}>{remainingToday} mensajes restantes hoy</Text>
        )}
      </LinearGradient>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Suggestion chips (only at start) */}
      {messages.length === 1 && (
        <View style={styles.suggestions}>
          <ScrollableChips prompts={suggestionPrompts} onSelect={(p) => setInput(p)} />
        </View>
      )}

      {/* Input */}
      <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Escríbele a Luna..."
          placeholderTextColor={Colors.dark.muted}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!input.trim() || sendMutation.isPending) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || sendMutation.isPending}
        >
          {sendMutation.isPending
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.sendIcon}>→</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Disclaimer */}
      <Text style={styles.disclaimer}>
        ⚕️ Información educativa — No reemplaza consulta médica
      </Text>
    </KeyboardAvoidingView>
  )
}

function ScrollableChips({ prompts, onSelect }: { prompts: string[]; onSelect: (p: string) => void }) {
  return (
    <View style={styles.chips}>
      {prompts.map((p, i) => (
        <TouchableOpacity key={i} style={styles.chip} onPress={() => onSelect(p)}>
          <Text style={styles.chipText}>{p}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.bg,
  },
  header: {
    alignItems: 'center',
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  backButton: {
    position: 'absolute',
    left: Spacing.md,
    bottom: Spacing.md,
    padding: 4,
  },
  backIcon: {
    fontSize: 22,
    color: Colors.dark.text,
  },
  headerTitle: {
    fontSize: Typography.fontSize.xl,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.dark.text,
  },
  headerSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.dark.muted,
    marginTop: 2,
  },
  remainingText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.gold.main,
    marginTop: 4,
  },
  offlineText: {
    fontSize: Typography.fontSize.xs,
    color: '#a78bfa',
    marginTop: 4,
    textAlign: 'center',
  },
  messagesList: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  messageWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 8,
  },
  userWrapper: { justifyContent: 'flex-end' },
  assistantWrapper: { justifyContent: 'flex-start' },
  avatarEmoji: { fontSize: 24, marginBottom: 4 },
  bubble: {
    maxWidth: '80%',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  userBubble: {
    backgroundColor: Colors.primary[600],
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: Colors.dark.card,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  bubbleText: {
    fontSize: Typography.fontSize.base,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.normal,
  },
  userText: { color: '#fff', fontFamily: Typography.fontFamily.regular },
  assistantText: { color: Colors.dark.text, fontFamily: Typography.fontFamily.regular },
  timestamp: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  suggestions: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  chipText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.lavender[300],
    fontFamily: Typography.fontFamily.medium,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
    backgroundColor: Colors.dark.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.dark.text,
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.regular,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { backgroundColor: Colors.dark.border },
  sendIcon: {
    color: '#fff',
    fontSize: Typography.fontSize.lg,
    fontFamily: Typography.fontFamily.bold,
  },
  disclaimer: {
    textAlign: 'center',
    fontSize: Typography.fontSize.xs,
    color: Colors.dark.muted,
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.dark.bg,
  },
})
