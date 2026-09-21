import React from 'react';

import { PaletteExplorer } from '../../components/ds/PaletteExplorer';

export default function PaletteScreen() {
  return (
    <PaletteExplorer
      title="Your palette"
      intro="Every colour your season gives you, in one place. Tap two to hold them side by side."
      pick={(p) => ([{ label: 'Best colours', swatches: p.best }, { label: 'Neutrals', swatches: p.neutrals }, { label: 'Accents', swatches: p.accents }, { label: 'Compare against these', swatches: p.compare }])}
      caveat={'The compare row is not a list of colours to avoid. It is the set worth holding up beside your best ones, so you can see the difference for yourself.'}
      lookKind={'colour'}
    />
  );
}
