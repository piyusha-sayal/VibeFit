/**
 * The routing decision, which is the part of onboarding that can strand
 * someone: a returning user sent back through the questions, or a new one
 * dropped onto an empty home screen.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

jest.mock('../services/profileService', () => ({
  getOnboarding: jest.fn(),
  saveOnboarding: jest.fn(),
}));

import { getOnboarding, saveOnboarding } from '../services/profileService';
import { useOnboardingStore } from './onboardingStore';

const mockGet = getOnboarding as jest.MockedFunction<typeof getOnboarding>;
const mockSave = saveOnboarding as jest.MockedFunction<typeof saveOnboarding>;

const USER = 'user-1';

function record(over: Record<string, unknown> = {}) {
  return {
    success: true,
    data: {
      id: 'o1', userId: USER, createdAt: 'now', updatedAt: 'now',
      completedAt: null, ...over,
    },
  } as never;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  useOnboardingStore.getState().reset();
  mockGet.mockReset();
  mockSave.mockReset();
});

describe('resolve', () => {
  it('sends an account with no record to onboarding', async () => {
    mockGet.mockResolvedValue({ success: false, data: null, status: 404 } as never);

    expect(await useOnboardingStore.getState().resolve(USER)).toBe('required');
  });

  it('sends a completed account straight past it', async () => {
    mockGet.mockResolvedValue(record({ completedAt: '2026-09-01T00:00:00Z' }));

    expect(await useOnboardingStore.getState().resolve(USER)).toBe('done');
  });

  it('treats a started-but-unfinished record as partial', async () => {
    mockGet.mockResolvedValue(record({ areasOfInterest: ['color'] }));

    expect(await useOnboardingStore.getState().resolve(USER)).toBe('partial');
    // And the answers are waiting when they go back in.
    expect(useOnboardingStore.getState().draft.areasOfInterest).toEqual(['color']);
  });

  it('never classifies an existing account as new when the network fails', async () => {
    // Showing onboarding to a returning user is the worse of the two failures.
    mockGet.mockResolvedValue({ success: false, data: null, error: 'offline' } as never);

    expect(await useOnboardingStore.getState().resolve(USER)).toBe('done');
  });

  it('marks an offline answer as provisional and writes nothing', async () => {
    mockGet.mockResolvedValue({ success: false, data: null, error: 'offline' } as never);

    await useOnboardingStore.getState().resolve(USER);

    expect(useOnboardingStore.getState().provisional).toBe(true);
    // No server said this account finished, so nothing may claim it did.
    expect(await AsyncStorage.getItem(`mylookfit.onboarding.done.${USER}`)).toBeNull();
  });

  it('asks again once connectivity returns', async () => {
    mockGet.mockResolvedValue({ success: false, data: null, error: 'offline' } as never);
    await useOnboardingStore.getState().resolve(USER);

    mockGet.mockResolvedValue({ success: false, data: null, status: 404 } as never);

    // A provisional answer must not be served for the rest of the session.
    expect(await useOnboardingStore.getState().resolve(USER)).toBe('required');
    expect(useOnboardingStore.getState().provisional).toBe(false);
  });

  it('does not ask again once the server has answered', async () => {
    mockGet.mockResolvedValue(record({ completedAt: '2026-09-01T00:00:00Z' }));
    await useOnboardingStore.getState().resolve(USER);
    mockGet.mockClear();

    await useOnboardingStore.getState().resolve(USER);

    expect(mockGet).not.toHaveBeenCalled();
  });

  it('answers from the local flag without a network call', async () => {
    mockGet.mockResolvedValue(record({ completedAt: '2026-09-01T00:00:00Z' }));
    await useOnboardingStore.getState().resolve(USER);
    useOnboardingStore.getState().reset();
    mockGet.mockClear();

    expect(await useOnboardingStore.getState().resolve(USER)).toBe('done');
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('keeps the flag per account, so a second person is asked', async () => {
    mockGet.mockResolvedValue(record({ completedAt: '2026-09-01T00:00:00Z' }));
    await useOnboardingStore.getState().resolve(USER);

    useOnboardingStore.getState().reset();
    mockGet.mockResolvedValue({ success: false, data: null, status: 404 } as never);

    expect(await useOnboardingStore.getState().resolve('user-2')).toBe('required');
  });

  it('strips server metadata out of the draft', async () => {
    mockGet.mockResolvedValue(record({ stylePreferences: ['Classic'] }));

    await useOnboardingStore.getState().resolve(USER);

    const draft = useOnboardingStore.getState().draft as Record<string, unknown>;
    expect(draft.stylePreferences).toEqual(['Classic']);
    for (const meta of ['id', 'userId', 'completedAt', 'createdAt', 'updatedAt']) {
      expect(draft[meta]).toBeUndefined();
    }
  });
});

describe('draft', () => {
  it('survives the app being closed mid-run', async () => {
    mockGet.mockResolvedValue({ success: false, data: null, status: 404 } as never);
    await useOnboardingStore.getState().resolve(USER);
    await useOnboardingStore.getState().saveDraft({ areasOfInterest: ['makeup'] });

    useOnboardingStore.getState().reset();
    await useOnboardingStore.getState().resolve(USER);

    expect(useOnboardingStore.getState().draft.areasOfInterest).toEqual(['makeup']);
  });
});

describe('complete', () => {
  it('tells the server the run finished and remembers it locally', async () => {
    mockSave.mockResolvedValue({ success: true, data: null } as never);

    const ok = await useOnboardingStore.getState().complete({
      areasOfInterest: ['color'],
    });

    expect(ok).toBe(true);
    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({ completed: true, areasOfInterest: ['color'] }),
    );
    expect(useOnboardingStore.getState().status).toBe('done');
  });

  it('keeps the interests after the draft is cleared', async () => {
    // The home screen orders itself by these, long after onboarding is over.
    mockSave.mockResolvedValue({ success: true, data: null } as never);
    mockGet.mockResolvedValue({ success: false, data: null, status: 404 } as never);
    await useOnboardingStore.getState().resolve(USER);
    await useOnboardingStore.getState().complete({ areasOfInterest: ['fashion'] });

    expect(useOnboardingStore.getState().draft).toEqual({});
    expect(useOnboardingStore.getState().interests).toEqual(['fashion']);
  });

  it('does not claim completion when the save failed', async () => {
    mockSave.mockResolvedValue({ success: false, data: null, error: 'nope' } as never);

    expect(await useOnboardingStore.getState().complete({})).toBe(false);
    expect(useOnboardingStore.getState().status).not.toBe('done');
  });

  it('stores no invented answer for a skipped question', async () => {
    mockSave.mockResolvedValue({ success: true, data: null } as never);

    await useOnboardingStore.getState().complete({
      areasOfInterest: null, stylePreferences: null, skippedFields: ['Style'],
    });

    const sent = mockSave.mock.calls[0][0] as Record<string, unknown>;
    expect(sent.stylePreferences).toBeNull();
    expect(sent.skippedFields).toEqual(['Style']);
  });
});
