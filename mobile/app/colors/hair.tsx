import React from 'react';

import { PaletteExplorer } from '../../components/ds/PaletteExplorer';

export default function HairScreen() {
  return (
    <PaletteExplorer
      title="Hair colour explorer"
      intro="Hair colours in the same warmth family as your own colouring."
      pick={(p) => ([{ label: 'Hair colours for you', swatches: p.hair }, { label: 'Your best colours, for contrast', swatches: p.best }])}
      caveat={'A salon result depends on your starting level and how your hair takes colour. Bring these as a direction, not a formula.'}
      lookKind={'hair'}
    />
  );
}
