export const ANIM = {
  ringPulse: {
    duration: 2400,
    delay: [0, 800, 1600],
  },
  scanLine: {
    duration: 2200,
    translateY: { from: -80, to: 80 },
  },
  breathe: {
    duration: 3000,
    opacity: { from: 0.35, to: 0.7 },
  },
  typeDot: {
    duration: 1400,
    delay: [0, 200, 400],
  },
  shimmer: {
    duration: 4000,
  },
  softFloat: {
    duration: 4000,
    translateY: { from: 0, to: -4 },
  },
} as const;
