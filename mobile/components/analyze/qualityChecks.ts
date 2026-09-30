/**
 * Turns the backend's flat `quality.flags` list into three separate,
 * supportive statuses — Lighting, Framing, Sharpness — instead of one opaque
 * "fair"/"poor" verdict.
 *
 * The flag strings below come straight from backend/ml/quality.py
 * (`build_flags`): "no face detected", "blurry", "too dark", "overexposed",
 * "face turned away", "body not fully visible". Nothing here is invented —
 * a flag this file doesn't recognise is simply ignored, not surfaced.
 */
import type { ImageQuality } from '../../types';

export type CheckStatus = 'good' | 'retake';

export interface QualityCheckItem {
  key: 'lighting' | 'framing' | 'sharpness';
  label: string;
  status: CheckStatus;
  note: string;
}

const LIGHTING_FLAGS = ['too dark', 'overexposed'];
const FRAMING_FLAGS = ['no face detected', 'face turned away', 'body not fully visible'];
const SHARPNESS_FLAGS = ['blurry'];

function statusFor(flags: string[], watch: string[]): CheckStatus {
  return flags.some((f) => watch.includes(f)) ? 'retake' : 'good';
}

export interface QualityChecks {
  items: QualityCheckItem[];
  /** Matches the gate the backend itself applies: a clean "good" verdict. */
  acceptable: boolean;
}

export function deriveQualityChecks(quality: ImageQuality): QualityChecks {
  const flags = quality.flags ?? [];
  const lighting = statusFor(flags, LIGHTING_FLAGS);
  const framing = statusFor(flags, FRAMING_FLAGS);
  const sharpness = statusFor(flags, SHARPNESS_FLAGS);

  const items: QualityCheckItem[] = [
    {
      key: 'lighting',
      label: 'Lighting',
      status: lighting,
      note: lighting === 'good'
        ? 'Even and well lit.'
        : 'Try soft, even light facing you — a window works well.',
    },
    {
      key: 'framing',
      label: 'Framing',
      status: framing,
      note: framing === 'good'
        ? 'Your face is clearly in frame.'
        : 'Face the camera directly with your whole face visible.',
    },
    {
      key: 'sharpness',
      label: 'Sharpness',
      status: sharpness,
      note: sharpness === 'good'
        ? 'Sharp and clear.'
        : 'Hold the camera steady, then retake.',
    },
  ];

  return { items, acceptable: quality.overall === 'good' && flags.length === 0 };
}
