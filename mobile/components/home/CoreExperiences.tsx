import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { FeatureCard } from '../ds';
import { SPACE } from '../../constants/theme';
import { CORE_TOOLS } from '../../constants/tools';

/** The six core styling experiences, two per row. */
export function CoreExperiences() {
  const router = useRouter();

  return (
    <View style={styles.grid}>
      {CORE_TOOLS.map((tool) => (
        <FeatureCard
          key={tool.key}
          icon={tool.emoji}
          title={tool.label}
          subtitle={tool.subtitle}
          onPress={() => router.push(tool.route as never)}
          style={styles.cell}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md },
  cell: { flexGrow: 0, flexBasis: '47%' },
});
