import React from 'react';
import { useRouter } from 'expo-router';

import { ListGroup, ListRow, PageHeader, Screen } from '../../components/ds';
import { ACADEMY_CATEGORIES, ACADEMY_GUIDES } from '../../constants/academy';
import { useAuthStore } from '../../store/authStore';

export default function MoreScreen() {
  const router = useRouter();
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
    <Screen>
      <PageHeader
        title="More"
        subtitle={user?.name ? `Signed in as ${user.name}` : undefined}
        back={false}
      />

      <ListGroup label="Beauty Academy">
        {ACADEMY_CATEGORIES.map((cat, index) => {
          const count = ACADEMY_GUIDES.filter((g) => g.category === cat.key).length;
          return (
            <ListRow
              key={cat.key}
              title={cat.label}
              value={count ? `${count} guide${count > 1 ? 's' : ''}` : 'Coming in a later phase'}
              onPress={count ? () => router.push(`/academy?category=${cat.key}` as never) : undefined}
              last={index === ACADEMY_CATEGORIES.length - 1}
            />
          );
        })}
      </ListGroup>

      <ListGroup label="Everything else">
        {links.map((link, index) => (
          <ListRow
            key={link.route}
            title={link.label}
            subtitle={link.body}
            onPress={() => router.push(link.route as never)}
            last={index === links.length - 1}
          />
        ))}
      </ListGroup>
    </Screen>
  );
}
