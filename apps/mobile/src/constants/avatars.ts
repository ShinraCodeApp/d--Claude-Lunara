export interface AvatarOption {
  id: string
  emoji: string
  name: string
  description: string
  unlockType: 'free' | 'level' | 'premium' | 'streak' | 'viral' | 'animated'
  unlockValue?: number
  gradient: readonly [string, string]
}

export const AVATARS: AvatarOption[] = [
  // ── FREE ─────────────────────────────────────────
  {
    id: 'luna_nueva',
    emoji: '🌑',
    name: 'Luna Nueva',
    description: 'Tu comienzo',
    unlockType: 'free',
    gradient: ['#1a0533', '#3b0764'],
  },
  {
    id: 'flor_lila',
    emoji: '🌸',
    name: 'Flor Lila',
    description: 'Delicada y fuerte',
    unlockType: 'free',
    gradient: ['#831843', '#be185d'],
  },
  {
    id: 'destello',
    emoji: '✨',
    name: 'Destello',
    description: 'Siempre brillante',
    unlockType: 'free',
    gradient: ['#78350f', '#d97706'],
  },
  {
    id: 'hoja',
    emoji: '🌿',
    name: 'Hoja Verde',
    description: 'Conectada a la tierra',
    unlockType: 'free',
    gradient: ['#064e3b', '#059669'],
  },

  // ── POR NIVEL ────────────────────────────────────
  {
    id: 'cristal',
    emoji: '💎',
    name: 'Cristal Lunar',
    description: 'Para las perseverantes',
    unlockType: 'level',
    unlockValue: 5,
    gradient: ['#164e63', '#0891b2'],
  },
  {
    id: 'mariposa',
    emoji: '🦋',
    name: 'Mariposa',
    description: 'Transformación constante',
    unlockType: 'level',
    unlockValue: 8,
    gradient: ['#4c1d95', '#7c3aed'],
  },
  {
    id: 'luna_creciente',
    emoji: '🌒',
    name: 'Luna Creciente',
    description: 'El ciclo avanza',
    unlockType: 'level',
    unlockValue: 10,
    gradient: ['#1e1b4b', '#4338ca'],
  },
  {
    id: 'hibisco',
    emoji: '🌺',
    name: 'Hibisco',
    description: 'Florecimiento pleno',
    unlockType: 'level',
    unlockValue: 12,
    gradient: ['#881337', '#f43f5e'],
  },
  {
    id: 'orbe',
    emoji: '🔮',
    name: 'Orbe Místico',
    description: 'Sabiduría interior',
    unlockType: 'level',
    unlockValue: 15,
    gradient: ['#3b0764', '#9333ea'],
  },
  {
    id: 'luna_llena',
    emoji: '🌕',
    name: 'Luna Llena',
    description: 'Plenitud total',
    unlockType: 'level',
    unlockValue: 18,
    gradient: ['#78350f', '#f59e0b'],
  },
  {
    id: 'loto',
    emoji: '🪷',
    name: 'Loto Sagrado',
    description: 'Pureza y renacimiento',
    unlockType: 'level',
    unlockValue: 20,
    gradient: ['#831843', '#ec4899'],
  },
  {
    id: 'ojo_luna',
    emoji: '🧿',
    name: 'Ojo de Luna',
    description: 'Guardiana de tu energía',
    unlockType: 'level',
    unlockValue: 25,
    gradient: ['#164e63', '#0284c7'],
  },
  {
    id: 'sol',
    emoji: '☀️',
    name: 'Sol Dorado',
    description: 'Luz que todo lo ilumina',
    unlockType: 'level',
    unlockValue: 30,
    gradient: ['#92400e', '#f59e0b'],
  },

  // ── PREMIUM ──────────────────────────────────────
  {
    id: 'corona',
    emoji: '👑',
    name: 'Corona Lunar',
    description: 'Exclusivo Premium',
    unlockType: 'premium',
    gradient: ['#713f12', '#ca8a04'],
  },
  {
    id: 'galaxia',
    emoji: '🌌',
    name: 'Galaxia',
    description: 'Exclusivo Premium',
    unlockType: 'premium',
    gradient: ['#0f172a', '#1e3a8a'],
  },
  {
    id: 'hada',
    emoji: '🧚',
    name: 'Hada del Jardín',
    description: 'Exclusivo Premium',
    unlockType: 'premium',
    gradient: ['#4a044e', '#a21caf'],
  },
  {
    id: 'sirena',
    emoji: '🧜',
    name: 'Sirena Lunar',
    description: 'Exclusivo Premium',
    unlockType: 'premium',
    gradient: ['#042f2e', '#0d9488'],
  },

  // ── ANIMALES VIRALES ACTUALES ────────────────────
  {
    id: 'hipito',
    emoji: '🦛',
    name: 'Hipito',
    description: 'El bebé más viral del mundo',
    unlockType: 'viral',
    gradient: ['#6d28d9', '#a78bfa'],
  },
  {
    id: 'doge',
    emoji: '🐕',
    name: 'Doge',
    description: 'Wow. Much cute. Very Luna.',
    unlockType: 'viral',
    gradient: ['#92400e', '#fbbf24'],
  },
  {
    id: 'pedro',
    emoji: '🦝',
    name: 'Pedro',
    description: 'El mapache bailarín de internet',
    unlockType: 'viral',
    gradient: ['#292524', '#78716c'],
  },
  {
    id: 'capibara',
    emoji: '🦫',
    name: 'Capibara Zen',
    description: 'Sin drama, pura vibra',
    unlockType: 'viral',
    gradient: ['#14532d', '#16a34a'],
  },
  {
    id: 'pesto',
    emoji: '🐧',
    name: 'Pesto',
    description: 'El pingüino más famoso de Melbourne',
    unlockType: 'viral',
    gradient: ['#0f172a', '#1e293b'],
  },
  {
    id: 'grumpy',
    emoji: '😾',
    name: 'Gato Gruñón',
    description: 'Siempre de mal humor',
    unlockType: 'viral',
    gradient: ['#374151', '#6b7280'],
  },
  {
    id: 'quokka',
    emoji: '😊',
    name: 'Quokka Feliz',
    description: 'El animal más sonriente de Australia',
    unlockType: 'viral',
    gradient: ['#065f46', '#34d399'],
  },
  {
    id: 'axolotl',
    emoji: '🦎',
    name: 'Axolotl Rosa',
    description: 'El ajolote viral de TikTok',
    unlockType: 'viral',
    gradient: ['#9d174d', '#f472b6'],
  },

  // ── ANIMADOS POPULARES ───────────────────────────
  {
    id: 'perrita_azul',
    emoji: '🐕‍🦺',
    name: 'Perrita Azul',
    description: '¡Vamos a jugar!',
    unlockType: 'animated',
    gradient: ['#1d4ed8', '#60a5fa'],
  },
  {
    id: 'alien_azul',
    emoji: '👾',
    name: 'Alien Azul',
    description: 'Ohana significa familia',
    unlockType: 'animated',
    gradient: ['#1e3a8a', '#3b82f6'],
  },
  {
    id: 'gatita_lunar',
    emoji: '🐱',
    name: 'Gatita Lunar',
    description: 'Kawaii & poderosa',
    unlockType: 'animated',
    gradient: ['#be185d', '#f9a8d4'],
  },
  {
    id: 'conejo_lazo',
    emoji: '🐰',
    name: 'Conejo Lazo',
    description: 'Dulce como el azúcar',
    unlockType: 'animated',
    gradient: ['#9d174d', '#fbcfe8'],
  },
  {
    id: 'espiritu_bosque',
    emoji: '🐻',
    name: 'Espíritu del Bosque',
    description: 'Guardián de la naturaleza',
    unlockType: 'animated',
    gradient: ['#14532d', '#86efac'],
  },
  {
    id: 'gato_negro',
    emoji: '🐈‍⬛',
    name: 'Jiji',
    description: 'Misterioso y elegante',
    unlockType: 'animated',
    gradient: ['#18181b', '#52525b'],
  },
  {
    id: 'raton_trueno',
    emoji: '⚡',
    name: 'Ratón Trueno',
    description: 'Atrapa lo que quieres',
    unlockType: 'animated',
    gradient: ['#713f12', '#fbbf24'],
  },
  {
    id: 'pato_marino',
    emoji: '🦆',
    name: 'Pato Marino',
    description: 'Exploradora incansable',
    unlockType: 'animated',
    gradient: ['#0c4a6e', '#38bdf8'],
  },
  {
    id: 'cocodrilo_rosa',
    emoji: '🐊',
    name: 'Cocodrilita',
    description: 'Feroz y adorable',
    unlockType: 'animated',
    gradient: ['#065f46', '#6ee7b7'],
  },
  {
    id: 'nutria',
    emoji: '🦦',
    name: 'Nutria Nadadora',
    description: 'Fluye con la corriente',
    unlockType: 'animated',
    gradient: ['#0369a1', '#7dd3fc'],
  },

  // ── POR RACHA ────────────────────────────────────
  {
    id: 'llama',
    emoji: '🔥',
    name: 'Llama Eterna',
    description: 'Racha de 30 días',
    unlockType: 'streak',
    unlockValue: 30,
    gradient: ['#7c2d12', '#ea580c'],
  },
  {
    id: 'ola',
    emoji: '🌊',
    name: 'Marea Alta',
    description: 'Racha de 60 días',
    unlockType: 'streak',
    unlockValue: 60,
    gradient: ['#0c4a6e', '#0284c7'],
  },
  {
    id: 'arcoiris',
    emoji: '🌈',
    name: 'Arco Iris',
    description: 'Racha de 100 días',
    unlockType: 'streak',
    unlockValue: 100,
    gradient: ['#581c87', '#7c3aed'],
  },
]

export const CRYSTAL_COSTS = { viral: 50, animated: 100 } as const

export function isAvatarUnlocked(
  avatar: AvatarOption,
  level: number,
  isPremium: boolean,
  longestStreak: number,
  unlockedAvatars: string[] = [],
): boolean {
  switch (avatar.unlockType) {
    case 'free': return true
    case 'viral':
    case 'animated':
      return isPremium || unlockedAvatars.includes(avatar.id)
    case 'level': return level >= (avatar.unlockValue ?? 0)
    case 'premium': return isPremium
    case 'streak': return longestStreak >= (avatar.unlockValue ?? 0)
    default: return false
  }
}

export function getUnlockLabel(avatar: AvatarOption): string {
  switch (avatar.unlockType) {
    case 'free': return 'Gratis'
    case 'viral': return `💎 ${CRYSTAL_COSTS.viral}`
    case 'animated': return `💎 ${CRYSTAL_COSTS.animated}`
    case 'level': return `Nivel ${avatar.unlockValue}`
    case 'premium': return '👑 Premium'
    case 'streak': return `🔥 ${avatar.unlockValue}d`
    default: return ''
  }
}
