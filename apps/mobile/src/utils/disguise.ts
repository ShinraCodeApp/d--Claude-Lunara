import { NativeModules, Platform } from 'react-native'

const { LunaraDisguise } = NativeModules

export interface DisguiseOption {
  alias: string
  label: string
  emoji: string
  description: string
}

export const DISGUISE_OPTIONS: DisguiseOption[] = [
  {
    alias: 'MainActivityLunara',
    label: 'Lunara',
    emoji: '🌙',
    description: 'Ícono original de la app',
  },
  {
    alias: 'MainActivityCalculadora',
    label: 'Calculadora',
    emoji: '🔢',
    description: 'La app aparece como "Calculadora"',
  },
  {
    alias: 'MainActivityNotas',
    label: 'Notas',
    emoji: '📝',
    description: 'La app aparece como "Notas"',
  },
  {
    alias: 'MainActivityClima',
    label: 'Clima',
    emoji: '⛅',
    description: 'La app aparece como "Clima"',
  },
]

export async function setDisguise(alias: string): Promise<boolean> {
  if (Platform.OS !== 'android' || !LunaraDisguise?.setDisguise) return false
  try {
    await LunaraDisguise.setDisguise(alias)
    return true
  } catch {
    return false
  }
}

export async function getActiveAlias(): Promise<string> {
  if (Platform.OS !== 'android' || !LunaraDisguise?.getActiveAlias) {
    return 'MainActivityLunara'
  }
  try {
    return await LunaraDisguise.getActiveAlias()
  } catch {
    return 'MainActivityLunara'
  }
}
