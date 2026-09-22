/**
 * Which ink is readable on a given colour.
 *
 * Personal Color Studio is the whole reason this exists. A palette screen that
 * marks the chosen swatch with a coloured border alone tells a person with low
 * vision nothing, and a tick drawn in a fixed colour disappears on half the
 * palette — white on Ivory, black on Espresso. The mark has to be drawn in
 * whichever of the two the background can actually carry.
 */

/** Relative luminance per WCAG 2.1, 0 (black) to 1 (white). */
export function relativeLuminance(hex: string): number {
  const channels = parseHex(hex);
  if (!channels) return 0;
  const linear = channels.map((value) => {
    const srgb = value / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

/** WCAG contrast ratio between two colours, 1 (identical) to 21 (black/white). */
export function contrastRatio(a: string, b: string): number {
  const light = Math.max(relativeLuminance(a), relativeLuminance(b));
  const dark = Math.min(relativeLuminance(a), relativeLuminance(b));
  return (light + 0.05) / (dark + 0.05);
}

/**
 * Near-black or near-white, whichever reads better on `hex`.
 *
 * Pure black and pure white are avoided so a mark on a mid-tone does not look
 * like a hole punched in the swatch.
 */
export function inkOn(hex: string): '#12100E' | '#FFFDF9' {
  return contrastRatio(hex, '#FFFDF9') >= contrastRatio(hex, '#12100E')
    ? '#FFFDF9'
    : '#12100E';
}

/** True when text of this size would meet WCAG AA on that background. */
export function meetsAA(foreground: string, background: string, large = false): boolean {
  return contrastRatio(foreground, background) >= (large ? 3 : 4.5);
}

function parseHex(hex: string): [number, number, number] | null {
  const cleaned = hex.trim().replace('#', '');
  const full = cleaned.length === 3
    ? cleaned.split('').map((c) => c + c).join('')
    : cleaned;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}
