/**
 * The visual reference wrapper.
 *
 * One place that decides what a reference looks like, so adding a photo
 * library later is a change to `source` rather than to every screen.
 *
 * Rules it enforces:
 * - A fixed aspect ratio, so a grid never jumps as things load.
 * - A loading state while a remote image resolves.
 * - A fallback illustration if the image errors, is missing, or is slow. An
 *   image failure degrades the card; it never breaks the screen.
 * - A caption saying these are references, not predictions of your result.
 */
import React, { useState } from 'react';
import { ActivityIndicator, Image, ImageSourcePropType, StyleProp, View, ViewStyle } from 'react-native';

import { Txt } from '../ds';
import { RADIUS, SPACE } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeProvider';

export const INSPIRATION_NOTE =
  'Reference illustrations, not a prediction of your own result.';

export interface ReferenceImageProps {
  /** Bundled or remote artwork. When absent, the fallback is used directly. */
  source?: ImageSourcePropType;
  /** Drawn when there is no source, or when the source fails. */
  fallback: React.ReactNode;
  aspectRatio?: number;
  width?: number | `${number}%`;
  caption?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function ReferenceImage({
  source,
  fallback,
  aspectRatio = 1,
  width = '100%',
  caption,
  style,
  accessibilityLabel,
}: ReferenceImageProps) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(Boolean(source));
  const [failed, setFailed] = useState(false);

  const showFallback = !source || failed;

  return (
    <View style={style}>
      <View
        style={{
          width,
          aspectRatio,
          borderRadius: RADIUS.md,
          overflow: 'hidden',
          backgroundColor: colors.surfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
      >
        {showFallback ? (
          fallback
        ) : (
          <>
            <Image
              source={source as ImageSourcePropType}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
              onLoadEnd={() => setLoading(false)}
              onError={() => {
                setFailed(true);
                setLoading(false);
              }}
            />
            {loading ? (
              <View style={{ position: 'absolute' }}>
                <ActivityIndicator color={colors.gold} />
              </View>
            ) : null}
          </>
        )}
      </View>

      {caption ? (
        <Txt variant="caption" tone="muted" style={{ marginTop: SPACE.xs }}>
          {caption}
        </Txt>
      ) : null}
    </View>
  );
}
