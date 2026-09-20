import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { readCachedAnalysis, writeCachedAnalysis, clearCachedAnalysis } from './localCache';
import { AnalysisResult } from '../types';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const analysis = (status: AnalysisResult['status']) =>
  ({ id: 'a1', status } as unknown as AnalysisResult);

describe('localCache', () => {
  beforeEach(() => AsyncStorage.clear());

  it('persists and reads back a complete analysis', async () => {
    await writeCachedAnalysis(analysis('complete'));
    expect(await readCachedAnalysis()).toEqual(analysis('complete'));
  });

  it('never caches a processing analysis', async () => {
    await writeCachedAnalysis(analysis('processing'));
    expect(await readCachedAnalysis()).toBeNull();
  });

  it('returns null for corrupt data instead of throwing', async () => {
    await AsyncStorage.setItem('vibefit-cache:latestAnalysis', '{not json');
    expect(await readCachedAnalysis()).toBeNull();
  });

  it('clears the cached analysis', async () => {
    await writeCachedAnalysis(analysis('complete'));
    await clearCachedAnalysis();
    expect(await readCachedAnalysis()).toBeNull();
  });
});
