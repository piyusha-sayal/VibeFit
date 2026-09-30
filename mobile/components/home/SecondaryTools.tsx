import React from 'react';
import { useRouter } from 'expo-router';

import { ListGroup, ListRow } from '../ds';
import { SECONDARY_TOOLS } from '../../constants/tools';

/** Everything besides the six core experiences — one tap away, out of the spotlight. */
export function SecondaryTools() {
  const router = useRouter();

  return (
    <ListGroup>
      {SECONDARY_TOOLS.map((tool, i) => (
        <ListRow
          key={tool.key}
          icon={tool.emoji}
          title={tool.label}
          subtitle={tool.subtitle}
          onPress={() => router.push(tool.route as never)}
          last={i === SECONDARY_TOOLS.length - 1}
        />
      ))}
    </ListGroup>
  );
}
