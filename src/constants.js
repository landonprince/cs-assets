export const STEAM_IMAGE_BASE = 'https://community.akamai.steamstatic.com/economy/image/'

export const RARITY_ORDER = [
  'Rarity_Contraband', 'Rarity_Ancient', 'Rarity_Legendary',
  'Rarity_Mythical', 'Rarity_Rare', 'Rarity_Uncommon', 'Rarity_Common',
]

export const RARITY_COLORS = {
  Rarity_Common:     '#b0c3d9',
  Rarity_Uncommon:   '#5e98d9',
  Rarity_Rare:       '#4b69ff',
  Rarity_Mythical:   '#8847ff',
  Rarity_Legendary:  '#d32ce6',
  Rarity_Ancient:    '#eb4b4b',
  Rarity_Contraband: '#e4ae39',
}

export const RARITY_LABELS = {
  Rarity_Contraband: 'Contraband',
  Rarity_Ancient:    'Covert',
  Rarity_Legendary:  'Classified',
  Rarity_Mythical:   'Restricted',
  Rarity_Rare:       'Mil-Spec',
  Rarity_Uncommon:   'Industrial Grade',
  Rarity_Common:     'Consumer Grade',
}

export const WEAR_ORDER = [
  'Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle-Scarred',
]

export const WEAR_LABELS = {
  'Factory New':    'FN',
  'Minimal Wear':   'MW',
  'Field-Tested':   'FT',
  'Well-Worn':      'WW',
  'Battle-Scarred': 'BS',
}

export function getRarity(item) {
  const internal = item.tags?.find(t => t.category === 'Rarity')?.internal_name ?? null
  return internal?.replace(/_(Weapon|Character|Equipment)$/, '') ?? null
}

export function getWear(item) {
  return item.tags?.find(t => t.category === 'Exterior')?.localized_tag_name ?? null
}

export function stripWear(name = '') {
  return name.replace(/ \((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)$/, '')
}
