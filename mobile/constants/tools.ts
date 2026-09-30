import type { AccentKey } from './theme';

export interface Tool {
  key: string;
  emoji: string;
  label: string;
  subtitle: string;
  route: string;
  accent: AccentKey;
}

/** The six studios at the heart of MyLookFit — each a full experience. */
export const CORE_TOOLS: Tool[] = [
  { key: 'colours', emoji: '🎨', label: 'Colours', subtitle: 'Your palette & undertone', route: '/colors', accent: 'blush' },
  { key: 'face', emoji: '🪞', label: 'Face', subtitle: 'Shape & features', route: '/face', accent: 'lavender' },
  { key: 'hair', emoji: '💇', label: 'Hair', subtitle: 'Cuts and styles for you', route: '/hair', accent: 'peach' },
  { key: 'makeup', emoji: '💄', label: 'Makeup', subtitle: 'Looks in your shades', route: '/makeup', accent: 'blush' },
  { key: 'style', emoji: '👗', label: 'Style', subtitle: 'Fit & silhouettes', route: '/style', accent: 'sage' },
  { key: 'create', emoji: '✨', label: 'Create My Look', subtitle: 'Put it all together', route: '/(tabs)/create', accent: 'gold' },
];

/** Everything else — one tap away from Home, without competing for space. */
export const SECONDARY_TOOLS: Tool[] = [
  { key: 'accessories', emoji: '👓', label: 'Accessories', subtitle: 'Glasses, earrings and more', route: '/accessories', accent: 'lavender' },
  { key: 'wardrobe', emoji: '🧥', label: 'Wardrobe', subtitle: 'What you already own', route: '/style/wardrobe', accent: 'peach' },
  { key: 'discover', emoji: '🧭', label: 'Discover', subtitle: 'Inspiration and trends', route: '/(tabs)/discover', accent: 'sage' },
  { key: 'academy', emoji: '📖', label: 'Academy', subtitle: 'Guides that explain the why', route: '/academy', accent: 'gold' },
  { key: 'stylist', emoji: '💬', label: 'AI Stylist', subtitle: 'Ask anything, anytime', route: '/(tabs)/chat', accent: 'blush' },
  { key: 'plan', emoji: '🗓️', label: 'Plan', subtitle: 'Your action plan', route: '/plan', accent: 'sage' },
];

/** All twelve tools, kept for anything that still expects one flat list. */
export const TOOLS: Tool[] = [...CORE_TOOLS, ...SECONDARY_TOOLS];
