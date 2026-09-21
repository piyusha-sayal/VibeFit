import React from 'react';

import { PaletteExplorer } from '../../components/ds/PaletteExplorer';

export default function BlushScreen() {
  return (
    <PaletteExplorer
      title="Blush explorer"
      intro="Cheek colours that sit in the same family as your lip and eye shades."
      pick={(p) => ([{ label: 'Blush for you', swatches: p.blush }, { label: 'Your accents', swatches: p.accents }])}
      caveat={'Blush reads two shades deeper in daylight than it does under indoor light. Build it up rather than committing in one pass.'}
      lookKind={'makeup'}
    />
  );
}
