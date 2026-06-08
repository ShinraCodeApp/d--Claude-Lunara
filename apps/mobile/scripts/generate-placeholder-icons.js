/**
 * Genera iconos PNG placeholder para Lunara.
 * Requiere: npm install -g canvas  (o instalar localmente)
 * Uso: node scripts/generate-placeholder-icons.js
 *
 * Genera todos los assets requeridos con el diseño base de Lunara
 * hasta que tengas el arte final listo.
 */

const { createCanvas } = require('canvas')
const fs = require('fs')
const path = require('path')

const OUT = path.join(__dirname, '..', 'assets', 'images')

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return { r, g, b }
}

function drawIcon(size, { bg1 = '#0d0118', bg2 = '#2d0145', emoji = '🌙', emojiSize = null } = {}) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // Gradient background
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.7)
  grad.addColorStop(0, '#2d0145')
  grad.addColorStop(1, '#0d0118')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)

  // Subtle glow
  const glow = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.4)
  glow.addColorStop(0, 'rgba(139, 92, 246, 0.25)')
  glow.addColorStop(1, 'rgba(139, 92, 246, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, size, size)

  // Emoji
  const fs_ = emojiSize ?? Math.floor(size * 0.5)
  ctx.font = `${fs_}px serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(emoji, size / 2, size / 2)

  return canvas
}

function drawSplash(w, h) {
  const canvas = createCanvas(w, h)
  const ctx = canvas.getContext('2d')

  const grad = ctx.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, '#0d0118')
  grad.addColorStop(0.5, '#1a0533')
  grad.addColorStop(1, '#2d0145')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)

  // Moon
  ctx.font = `${Math.floor(w * 0.18)}px serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('🌙', w / 2, h * 0.42)

  // App name
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${Math.floor(w * 0.1)}px sans-serif`
  ctx.fillText('Lunara', w / 2, h * 0.55)

  // Subtitle
  ctx.fillStyle = 'rgba(196, 181, 253, 0.7)'
  ctx.font = `${Math.floor(w * 0.04)}px sans-serif`
  ctx.fillText('by ShinraCode', w / 2, h * 0.61)

  return canvas
}

function drawNotificationIcon(size) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  ctx.clearRect(0, 0, size, size) // transparent bg
  ctx.fillStyle = '#ffffff'
  ctx.font = `${Math.floor(size * 0.7)}px serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('🌙', size / 2, size / 2)

  return canvas
}

function save(canvas, filename) {
  const buf = canvas.toBuffer('image/png')
  const p = path.join(OUT, filename)
  fs.writeFileSync(p, buf)
  console.log(`✓ ${filename} (${canvas.width}×${canvas.height})`)
}

try {
  save(drawIcon(1024), 'icon.png')
  save(drawIcon(1024, { emojiSize: 512 }), 'adaptive-icon.png')
  save(drawSplash(1284, 2778), 'splash.png')
  save(drawIcon(48, { emojiSize: 30 }), 'favicon.png')
  save(drawNotificationIcon(96), 'notification-icon.png')
  console.log('\n✅ Iconos placeholder generados en assets/images/')
  console.log('   Reemplázalos con tu arte final cuando esté listo.\n')
} catch (e) {
  console.error('\n❌ Error:', e.message)
  console.error('   Instala canvas: cd apps/mobile && yarn add canvas\n')
}
