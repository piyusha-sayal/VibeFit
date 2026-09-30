/**
 * Staged progress for the upload → analyze wait, in place of a bare spinner.
 *
 * Upload has a real percentage from the network layer; analysis does not (the
 * backend runs one background job), so once upload finishes we advance through
 * named stages on a timer. Either way the current stage is the one thing
 * announced live, so a screen reader user gets the same story as everyone else.
 */
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Txt } from '../ds';
import { ProgressRing } from '../ds/ProgressRing';
import { SPACE } from '../../constants/theme';

const STAGES = [
  'Reading your features',
  'Understanding your colours',
  'Building recommendations',
  'Preparing your Beauty Passport',
];

const STAGE_MS = 3800;

export function ProcessingStages({
  isUploading, uploadProgress, isAnalyzing,
}: {
  isUploading: boolean;
  uploadProgress: number;
  isAnalyzing: boolean;
}) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!isAnalyzing) {
      setStage(0);
      return undefined;
    }
    const id = setInterval(() => {
      setStage((s) => (s < STAGES.length - 1 ? s + 1 : s));
    }, STAGE_MS);
    return () => clearInterval(id);
  }, [isAnalyzing]);

  const label = isUploading ? `Uploading your photo — ${uploadProgress}%` : STAGES[stage];
  const ringValue = isUploading ? uploadProgress / 100 : (stage + 1) / STAGES.length;

  return (
    <View style={{ alignItems: 'center', paddingVertical: SPACE.xxl }}>
      <ProgressRing value={ringValue} accessibilityLabel={label}>
        <Txt variant="h3" tone="accent" weight="semibold">
          {isUploading ? `${uploadProgress}%` : `${stage + 1}/${STAGES.length}`}
        </Txt>
      </ProgressRing>
      <Txt
        variant="body"
        weight="semibold"
        tone="muted"
        live="polite"
        style={{ marginTop: SPACE.lg, textAlign: 'center' }}
      >
        {label}
      </Txt>
    </View>
  );
}
