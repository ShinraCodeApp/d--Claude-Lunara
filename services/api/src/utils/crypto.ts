import crypto from 'crypto'
import { env } from '@/config/env'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const TAG_LENGTH = 16

function getKey(): Buffer {
  const key = env.ENCRYPTION_KEY
  if (!key) throw new Error('ENCRYPTION_KEY not configured')
  return Buffer.from(key, 'hex')
}

export function encrypt(text: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const tag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`
}

export function decrypt(encryptedText: string): string {
  const key = getKey()
  const [ivHex, tagHex, encrypted] = encryptedText.split(':')

  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

export function hashPassword(password: string): Promise<string> {
  return import('bcryptjs').then((b) => b.hash(password, 12))
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  return import('bcryptjs').then((b) => b.compare(password, hash))
}

export function generateSecureToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex')
}

export function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString()
}
