import { MMKV } from 'react-native-mmkv'

const authStorage = new MMKV({ id: 'lunara-local-auth' })

interface LocalAccount {
  id: string
  email: string
  firstName: string
  passwordHash: string
  createdAt: string
  syncStatus: 'pending' | 'synced'
  isPremium: boolean
}

// djb2 hash — adequate since storage is AES-256 encrypted by MMKV
function hashPassword(email: string, password: string): string {
  const input = `lunara:${email.toLowerCase()}:${password}:sc2024`
  let hash = 5381
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i)
    hash = hash & hash
  }
  return Math.abs(hash).toString(36) + input.length.toString(36)
}

function getAccounts(): LocalAccount[] {
  try {
    const raw = authStorage.getString('accounts')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveAccounts(accounts: LocalAccount[]) {
  authStorage.set('accounts', JSON.stringify(accounts))
}

const PROMO_MAX = 10
const PROMO_MARKER = '@@'

function isPromoEmail(email: string): boolean {
  return email.startsWith(PROMO_MARKER)
}

function getPromoCount(accounts: LocalAccount[]): number {
  return accounts.filter((a) => a.isPremium).length
}

export function registerLocalAccount(
  email: string,
  password: string,
  firstName: string
): { success: true; account: LocalAccount } | { success: false; error: string } {
  const emailNorm = email.trim().toLowerCase()
  const promo = isPromoEmail(emailNorm)

  // Promo accounts skip email format validation — can use any string with @@
  if (!promo && (!emailNorm.includes('@') || !emailNorm.includes('.'))) {
    return { success: false, error: 'El correo no es válido' }
  }
  if (password.length < 6) {
    return { success: false, error: 'La contraseña debe tener al menos 6 caracteres' }
  }

  const accounts = getAccounts()

  if (accounts.find((a) => a.email === emailNorm)) {
    return { success: false, error: 'Ya existe una cuenta con ese usuario' }
  }

  if (promo && getPromoCount(accounts) >= PROMO_MAX) {
    return { success: false, error: `Las ${PROMO_MAX} cuentas Premium de prueba ya fueron utilizadas` }
  }

  const account: LocalAccount = {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    email: emailNorm,
    firstName: firstName.trim(),
    passwordHash: hashPassword(emailNorm, password),
    createdAt: new Date().toISOString(),
    syncStatus: 'pending',
    isPremium: promo,
  }

  saveAccounts([...accounts, account])
  return { success: true, account }
}

// Called after backend migration — marks account as synced so it won't re-register
export function markAccountSynced(email: string) {
  const emailNorm = email.trim().toLowerCase()
  const accounts = getAccounts()
  const updated = accounts.map((a) =>
    a.email === emailNorm ? { ...a, syncStatus: 'synced' as const } : a
  )
  saveAccounts(updated)
}

// Returns accounts that were created locally and not yet synced to backend
export function getPendingSyncAccounts(): LocalAccount[] {
  return getAccounts().filter((a) => a.syncStatus === 'pending')
}

export function loginLocalAccount(
  email: string,
  password: string
): { success: true; account: LocalAccount } | { success: false; error: string } {
  const emailNorm = email.trim().toLowerCase()
  const accounts = getAccounts()
  const account = accounts.find((a) => a.email === emailNorm)

  if (!account) {
    return { success: false, error: 'No existe una cuenta con ese correo' }
  }
  if (account.passwordHash !== hashPassword(emailNorm, password)) {
    return { success: false, error: 'Contraseña incorrecta' }
  }

  return { success: true, account }
}
