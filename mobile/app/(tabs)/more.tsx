import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Card, SectionHeader, Txt } from '../../components/ds';
import { ACADEMY_CATEGORIES, ACADEMY_GUIDES } from '../../constants/academy';
import { SPACE } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeProvider';

export default function MoreScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);

  const links = [
    { label: 'Saved looks', body: 'Everything you kept, filtered by status.', route: '/(tabs)/passport' },
    { label: 'Vibe Profile', body: 'The read-only view with sources and limitations.', route: '/vibe-profile' },
    { label: 'Action plan', body: 'What to do next, with feedback.', route: '/plan' },
    { label: 'Ask the stylist', body: 'Chat about anything in your passport.', route: '/(tabs)/chat' },
    { label: 'Settings and privacy', body: 'Theme, photos, consent, account.', route: '/settings' },
    { label: 'Help', body: 'Photo guidance, understanding results, support.', route: '/settings/help' },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <Txt variant="display" serif>More</Txt>
      {user?.name ? (
        <Txt variant="body" tone="muted" style={{ marginTop: SPACE.xs }}>Signed in as {user.name}</Txt>
      ) : null}

      <View style={styles.section}>
        <SectionHeader title="Beauty Academy" />
        {ACADEMY_CATEGORIES.map((cat) => {
          const count = ACADEMY_GUIDES.filter((g) => g.category === cat.key).length;
          return (
            <Card
              key={cat.key}
              style={{ marginBottom: SPACE.sm }}
              onPress={count ? () => router.push(`/academy?category=${cat.key}` as never) : undefined}
            >
              <View style={styles.rowBetween}>
                <Txt variant="body" weight="semibold" tone={count ? 'default' : 'subtle'}>{cat.label}</Txt>
                <Txt variant="caption" tone="muted">
                  {count ? `${count} guide${count > 1 ? 's' : ''}` : 'Coming in a later phase'}
                </Txt>
              </View>
            </Card>
          );
        })}
      </View>

      <View style={styles.section}>
        <SectionHeader title="Everything else" />
        {links.map((link) => (
          <Card key={link.route} style={{ marginBottom: SPACE.sm }} onPress={() => router.push(link.route as never)}>
            <Txt variant="body" weight="semibold">{link.label}</Txt>
            <Txt variant="bodySm" tone="muted" style={{ marginTop: 2 }}>{link.body}</Txt>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACE.xl, paddingTop: SPACE.xxxl, paddingBottom: SPACE.xxxl * 2 },
  section: { marginTop: SPACE.xxl },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SPACE.md },
});
