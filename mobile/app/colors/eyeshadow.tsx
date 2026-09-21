import React from 'react';

import { PaletteExplorer } from '../../components/ds/PaletteExplorer';

export default function EyeshadowScreen() {
  return (
    <PaletteExplorer
      title="Eye makeup explorer"
      intro="Eyeshadow families that hold up against your contrast level."
      pick={(p) => ([{ label: 'Eyeshadow for you', swatches: p.eyeshadow }, { label: 'Your neutrals', swatches: p.neutrals }])}
      caveat={'Placement matters as much as colour. The Makeup Studio in Discover My Face covers technique; this screen is only about which colours suit you.'}
      lookKind={'makeup'}
    />
  );
}
