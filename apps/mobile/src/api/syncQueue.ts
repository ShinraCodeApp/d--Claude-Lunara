import { AppState } from 'react-native'
import { MMKV } from 'react-native-mmkv'
import { apiClient } from './client'

// Cola de envíos al servidor que sobrevive a cerrar la app. Los registros se
// guardan primero en el celular; esta cola los manda cuando hay conexión (o
// cuando el servidor gratis termina de despertar) y reintenta si falla.
// Los endpoints que usa son idempotentes por día, así que reintentar no duplica.

type Method = 'post' | 'put'
interface PendingRequest {
  id: string
  method: Method
  url: string
  body: unknown
  attempts: number
  createdAt: number
}

const storage = new MMKV({ id: 'lunara-sync-queue' })
const KEY = 'pending'
const MAX_ATTEMPTS = 20
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000 // un mes

function read(): PendingRequest[] {
  try {
    const raw = storage.getString(KEY)
    return raw ? (JSON.parse(raw) as PendingRequest[]) : []
  } catch {
    return []
  }
}

function write(items: PendingRequest[]) {
  storage.set(KEY, JSON.stringify(items))
}

export function pendingCount(): number {
  return read().length
}

/** Agrega un envío a la cola e intenta mandarlo enseguida. */
export function enqueue(method: Method, url: string, body: unknown) {
  const items = read()
  items.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    method,
    url,
    body,
    attempts: 0,
    createdAt: Date.now(),
  })
  write(items)
  void flush()
}

let flushing = false

/** Manda los pendientes en orden. Se frena en el primer error de red. */
export async function flush(): Promise<void> {
  if (flushing) return
  flushing = true
  try {
    let items = read()
    while (items.length) {
      const item = items[0]
      try {
        await apiClient.request({ method: item.method, url: item.url, data: item.body })
        items = read().filter((i) => i.id !== item.id)
        write(items)
      } catch (err: any) {
        const status: number | undefined = err?.response?.status
        const tooOld = Date.now() - item.createdAt > MAX_AGE_MS
        // 4xx (salvo 401/408/429): el servidor lo rechaza, reintentar no sirve
        const rejected = status !== undefined && status >= 400 && status < 500 && ![401, 408, 429].includes(status)
        if (rejected || tooOld || item.attempts + 1 >= MAX_ATTEMPTS) {
          items = read().filter((i) => i.id !== item.id)
        } else {
          items = read().map((i) => (i.id === item.id ? { ...i, attempts: i.attempts + 1 } : i))
          write(items)
          break // sin red o servidor dormido: probamos más tarde
        }
        write(items)
      }
    }
  } finally {
    flushing = false
  }
}

// Reintentar al abrir la app y cada vez que vuelve al frente
let started = false
export function startSyncQueue() {
  if (started) return
  started = true
  void flush()
  AppState.addEventListener('change', (state) => {
    if (state === 'active') void flush()
  })
}
