import React from 'react';

import { PaletteExplorer } from '../../components/ds/PaletteExplorer';

export default function LipstickScreen() {
  return (
    <PaletteExplorer
      title="Lipstick explorer"
      intro="Shades drawn from your own season rather than a universal chart."
      pick={(p) => ([{ label: 'Lipstick shades for you', swatches: p.lipstick }, { label: 'Worth comparing against', swatches: p.compare }])}
      caveat={'MyLookFit names colour families, not brand shades. A screen cannot predict how a particular product will oxidise on your lips, so treat these as the family to shop within and swatch the real thing on your hand.'}
      lookKind={'makeup'}
    />
  );
}
