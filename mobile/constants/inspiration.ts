/**
 * Styling inspiration, expressed as palettes rather than stock photography.
 *
 * Shipping photographs of models would mean shipping a cast, and any cast is a
 * statement about whose face the product is for. Palettes and garment names
 * carry the idea without that, and they stay honest at every skin tone.
 */
import type { AccentKey } from './theme';

export interface Inspiration {
  title: string;
  region: string;
  palette: string[];
  accent: AccentKey;
}

export const INSPIRATION: Inspiration[] = [
  { title: 'Festival silks', region: 'India', palette: ['#b5542c', '#d3a127', '#33502f'], accent: 'peach' },
  { title: 'Monsoon cottons', region: 'India', palette: ['#6f9490', '#e6dac5', '#8a8f5a'], accent: 'sage' },
  { title: 'Wedding jewel tones', region: 'South Asia', palette: ['#1f4fa8', '#b0173c', '#00734a'], accent: 'blush' },
  { title: 'Quiet tailoring', region: 'Global', palette: ['#2b2622', '#f2ece3', '#a79176'], accent: 'gold' },
  { title: 'Desert evening', region: 'United States', palette: ['#c07a5c', '#dd9078', '#4f5f80'], accent: 'peach' },
  { title: 'Coastal summer', region: 'Global', palette: ['#a8c6e8', '#e4b3c2', '#f3f2ee'], accent: 'lavender' },
  { title: 'Street layering', region: 'East Asia', palette: ['#33373b', '#c2c8cd', '#ec3f8c'], accent: 'lavender' },
  { title: 'Studio minimal', region: 'Europe', palette: ['#e6e0d8', '#a49b93', '#6f6058'], accent: 'sage' },
];
