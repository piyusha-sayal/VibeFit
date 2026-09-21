/**
 * Merges guide progress recorded on this device before it lived on the account.
 *
 * Runs once per app session, and only upward: the server is never told to
 * clear anything, so a guide finished on another device stays finished.
 */
import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useSyncGuideProgress } from './useFace';

const STORAGE_KEY = 'vibefit.guidesCompleted';
const SYNCED_KEY = 'vibefit.guidesSynced';

export function useGuideSync(): void {
  const sync = useSyncGuideProgress();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void (async () => {
      try {
        const alreadySynced = await AsyncStorage.getItem(SYNCED_KEY);
        if (alreadySynced) return;

        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const completed = raw ? (JSON.parse(raw) as string[]) : [];
        if (completed.length === 0) {
          await AsyncStorage.setItem(SYNCED_KEY, '1');
          return;
        }

        await sync.mutateAsync({ completed, saved: [] });
        await AsyncStorage.setItem(SYNCED_KEY, '1');
      } catch {
        // Left unmarked so the merge is retried next launch. Nothing is lost:
        // the device list is still there and the server keeps what it has.
      }
    })();
  }, [sync]);
}
