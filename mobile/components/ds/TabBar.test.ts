import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-router', () => ({ useRouter: () => ({}), usePathname: () => '/' }));
jest.mock('../../utils/haptics', () => ({ tap: () => undefined }));

import { activeTabFor } from './TabBar';

// Create, Results and Chat live inside the tab group but are pushed screens;
// the bar used to light up Home on all of them.
describe('activeTabFor', () => {
  it('highlights the tab that owns the path', () => {
    expect(activeTabFor('/')).toBe('index');
    expect(activeTabFor('/progress')).toBe('progress');
    expect(activeTabFor('/scan')).toBe('scan');
    expect(activeTabFor('/passport')).toBe('passport');
    expect(activeTabFor('/profile')).toBe('profile');
  });

  it('highlights nothing on pushed screens rather than claiming Home', () => {
    for (const path of ['/create', '/results', '/chat', '/more', '/discover', '/colors/report']) {
      expect(activeTabFor(path)).toBeNull();
    }
  });

  it('does not match a tab by prefix alone', () => {
    expect(activeTabFor('/scanner')).toBeNull();
    expect(activeTabFor('/profile-x')).toBeNull();
  });
});
