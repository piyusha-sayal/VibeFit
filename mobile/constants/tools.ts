import type { AccentKey } from './theme';

export interface Tool {
  key: string;
  emoji: string;
  label: string;
  route: string;
  accent: AccentKey;
}

/** The Home tools grid: every feature one tap away, each with its own colour. */
export const TOOLS: Tool[] = [
  { key: 'colours', emoji: '🎨', label: 'My Colours', route: '/colors', accent: 'blush' },
  { key: 'face', emoji: '🪞', label: 'Face Shape', route: '/face', accent: 'lavender' },
  { key: 'hair', emoji: '💇', label: 'Hairstyles', route: '/hair', accent: 'peach' },
  { key: 'makeup', emoji: '💄', label: 'Makeup', route: '/makeup', accent: 'blush' },
  { key: 'create', emoji: '✨', label: 'Create Look', route: '/(tabs)/create', accent: 'gold' },
  { key: 'style', emoji: '👗', label: 'Style & Fit', route: '/style', accent: 'sage' },
  { key: 'wardrobe', emoji: '🧥', label: 'Wardrobe', route: '/style/wardrobe', accent: 'peach' },
  { key: 'accessories', emoji: '👓', label: 'Accessories', route: '/accessories', accent: 'lavender' },
  { key: 'discover', emoji: '🧭', label: 'Discover', route: '/(tabs)/discover', accent: 'sage' },
  { key: 'academy', emoji: '📖', label: 'Guides', route: '/academy', accent: 'gold' },
  { key: 'stylist', emoji: '💬', label: 'Ask Stylist', route: '/(tabs)/chat', accent: 'blush' },
  { key: 'plan', emoji: '🗓️', label: 'Action Plan', route: '/plan', accent: 'sage' },
];
