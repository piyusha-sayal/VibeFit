import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';

import { Txt } from './index';
import { Logo } from './Logo';
import { SPACE } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * The screen that covers a cold start.
 *
 * The free plan spins the container down after fifteen minutes idle, and
 * bringing it back takes around forty-five seconds. Measured: importing the
 * application alone is ten seconds of that, and the rest is the host
 * scheduling and pulling the image. No change to this codebase removes it.
 *
 * So the wait is real and it is not going away. What this screen decides is
 * whether it reads as the app working or the app broken. A dead spinner over
 * forty-five seconds reads as broken. A brand mark, a moving light and copy
 * that changes as the wait lengthens reads as working — and the copy stays
 * honest rather than pretending to measure progress it cannot see.
 */

interface Stage {
  /** Milliseconds elapsed at which this wording takes over. */
  after: number;
  title: string;
  body: string;
}

/** What to say, and from when. Each stage replaces the one before it. */
const STAGES: Stage[] = [
  { after: 0, title: 'Find what fits you.', body: 'Getting things ready…' },
  {
    after: 6_000,
    title: 'Waking the service…',
    body: 'The server rests when nobody has used it for a while. Starting it '
      + 'back up takes about a minute.',
  },
  {
    after: 25_000,
    title: 'Almost there…',
    body: 'Still starting. This only happens on the first visit after a quiet '
      + 'spell — it will be quick from here.',
  },
];

function stageAt(elapsed: number): Stage {
  let current = STAGES[0];
  for (const stage of STAGES) if (elapsed >= stage.after) current = stage;
  return current;
}

/** A bar of light that travels across the mark, once every two seconds. */
function Shimmer({ width }: { width: number }) {
  const { colors, reducedMotion } = useTheme();
  const travel = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reducedMotion) return undefined;
    const loop = Animated.loop(
      Animated.timing(travel, {
        toValue: 1,
        duration: 2_000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [reducedMotion, travel]);

  // Reduced motion gets a still bar rather than no bar: the screen should
  // still look deliberate, it just must not move.
  if (reducedMotion) {
    return (
      <View style={{
        width, height: 2, borderRadius: 1, overflow: 'hidden',
        backgroundColor: colors.surfaceAlt,
      }}>
        <View style={{ width: width / 3, height: 2, backgroundColor: colors.gold }} />
      </View>
    );
  }

  return (
    <View style={{
      width, height: 2, borderRadius: 1, overflow: 'hidden',
      backgroundColor: colors.surfaceAlt,
    }}>
      <Animated.View
        style={{
          width: width / 3,
          height: 2,
          backgroundColor: colors.gold,
          transform: [{
            translateX: travel.interpolate({
              inputRange: [0, 1],
              outputRange: [-width / 3, width],
            }),
          }],
        }}
      />
    </View>
  );
}

export function WakingScreen() {
  const { colors, reducedMotion } = useTheme();
  const [elapsed, setElapsed] = useState(0);
  const breath = useRef(new Animated.Value(0)).current;

  // One timer, ticking slowly: the copy changes at six and twenty-five
  // seconds and nothing else depends on it.
  useEffect(() => {
    const started = Date.now();
    const tick = setInterval(() => setElapsed(Date.now() - started), 1_000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (reducedMotion) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1, duration: 1_800,
          easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
        Animated.timing(breath, {
          toValue: 0, duration: 1_800,
          easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reducedMotion, breath]);

  const stage = useMemo(() => stageAt(elapsed), [elapsed]);

  return (
    <View
      style={{
        flex: 1, alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: SPACE.xl, backgroundColor: colors.bg,
      }}
      accessibilityLiveRegion="polite"
      accessibilityRole="progressbar"
      accessibilityLabel={`${stage.title} ${stage.body}`}
    >
      <Animated.View
        style={reducedMotion ? undefined : {
          opacity: breath.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }),
          transform: [{
            scale: breath.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1.02] }),
          }],
        }}
      >
        <Logo variant="horizontal" width={200} showTagline={false} />
      </Animated.View>

      <View style={{ marginTop: SPACE.xxl }}>
        <Shimmer width={200} />
      </View>

      <Txt variant="body" serif
           style={{ marginTop: SPACE.xl, textAlign: 'center' }}>
        {stage.title}
      </Txt>
      <Txt variant="caption" tone="subtle"
           style={{ marginTop: SPACE.sm, textAlign: 'center', lineHeight: 18 }}>
        {stage.body}
      </Txt>
    </View>
  );
}
