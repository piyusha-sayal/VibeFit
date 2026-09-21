/**
 * The MyLookFit mark.
 *
 * One component so the logo is never stretched, never recreated in text, and
 * never repeated on every screen by accident. Variants exist because the
 * supplied kit ships separate artwork for dark and light grounds — the
 * gradient gold reads as mud on ivory, and the black mark disappears on black.
 *
 * Aspect ratios come from the source files (1:1 symbol, 4:1 horizontal) and
 * are fixed here so a caller can only set one dimension.
 */
import React from 'react';
import { Image, StyleProp, View, ViewStyle } from 'react-native';

import { Txt } from './index';
import { SPACE } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeProvider';

// Static requires: Metro resolves these at build time so the artwork is
// bundled rather than fetched. There is no import form for a PNG here.
/* eslint-disable @typescript-eslint/no-var-requires */
const SYMBOL_GOLD = require('../../assets/brand/symbol-gold.png');
const SYMBOL_BLACK = require('../../assets/brand/symbol-black.png');
const HORIZONTAL_GOLD = require('../../assets/brand/logo-horizontal.png');
const HORIZONTAL_BLACK = require('../../assets/brand/logo-horizontal-black.png');
/* eslint-enable @typescript-eslint/no-var-requires */

const SYMBOL_RATIO = 1;
const HORIZONTAL_RATIO = 1600 / 400;

export interface LogoProps {
  /** `symbol` is the mark alone; `horizontal` is the full lockup with wordmark. */
  variant?: 'symbol' | 'horizontal';
  /** Rendered width in points. Height follows the source aspect ratio. */
  width?: number;
  /** Tagline under the lockup. Off by default — it is unreadable when small. */
  showTagline?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Logo({ variant = 'symbol', width = 48, showTagline = false, style }: LogoProps) {
  const { name } = useTheme();
  const dark = name === 'dark';

  const source = variant === 'symbol'
    ? (dark ? SYMBOL_GOLD : SYMBOL_BLACK)
    : (dark ? HORIZONTAL_GOLD : HORIZONTAL_BLACK);
  const ratio = variant === 'symbol' ? SYMBOL_RATIO : HORIZONTAL_RATIO;

  return (
    <View style={style}>
      <Image
        source={source}
        style={{ width, height: width / ratio }}
        resizeMode="contain"
        accessibilityRole="image"
        accessibilityLabel="MyLookFit"
      />
      {showTagline ? (
        <Txt variant="caption" tone="muted" style={{ marginTop: SPACE.sm, letterSpacing: 1 }}>
          Find what fits you.
        </Txt>
      ) : null}
    </View>
  );
}
