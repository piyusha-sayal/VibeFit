/**
 * Taking the selfie: the front camera, and a refused permission that says
 * whether Android will ask again. The picker and the upload are mocked.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { renderHook } from '@testing-library/react-native';

jest.mock('expo-image-picker', () => ({
  CameraType: { front: 'front', back: 'back' },
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
jest.mock('../utils/cameraBridge', () => ({ openInAppCamera: jest.fn() }));
jest.mock('../store/analysisStore', () => {
  const store = { loadLatest: jest.fn(), upload: jest.fn(async () => ({ id: 'a1' })) };
  return { useAnalysisStore: () => store, mockStore: store };
});

import * as ImagePicker from 'expo-image-picker';
import { useAnalysis } from './useAnalysis';
import { PhotoPermissionError } from '../utils/photoPermission';

const picker = ImagePicker as unknown as Record<string, jest.Mock>;
const camera = jest.requireMock('../utils/cameraBridge') as { openInAppCamera: jest.Mock };
const store = (jest.requireMock('../store/analysisStore') as { mockStore: { upload: jest.Mock } }).mockStore;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('cameraAndAnalyze', () => {
  it('opens the in-app camera and uploads the selfie', async () => {
    picker.requestCameraPermissionsAsync.mockResolvedValue({ status: 'granted', canAskAgain: true } as never);
    camera.openInAppCamera.mockResolvedValue({ uri: 'file:///selfie.jpg', mimeType: 'image/jpeg' } as never);
    const { result } = renderHook(() => useAnalysis());

    await result.current.cameraAndAnalyze();

    expect(camera.openInAppCamera).toHaveBeenCalled();
    expect(picker.launchCameraAsync).not.toHaveBeenCalled();
    expect(store.upload).toHaveBeenCalledWith('file:///selfie.jpg', 'image/jpeg');
  });

  it('reports a permanently refused camera so Settings can be offered', async () => {
    picker.requestCameraPermissionsAsync.mockResolvedValue({ status: 'denied', canAskAgain: false } as never);
    const { result } = renderHook(() => useAnalysis());

    const error = await result.current.cameraAndAnalyze().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(PhotoPermissionError);
    expect((error as PhotoPermissionError).canAskAgain).toBe(false);
    expect(camera.openInAppCamera).not.toHaveBeenCalled();
  });

  it('uploads nothing when the camera is closed without a photo', async () => {
    picker.requestCameraPermissionsAsync.mockResolvedValue({ status: 'granted', canAskAgain: true } as never);
    camera.openInAppCamera.mockResolvedValue(null as never);
    const { result } = renderHook(() => useAnalysis());
    await expect(result.current.cameraAndAnalyze()).resolves.toBeNull();
    expect(store.upload).not.toHaveBeenCalled();
  });
});

describe('pickAndAnalyze', () => {
  it('reports a refused photo library the same way', async () => {
    picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ status: 'denied', canAskAgain: true } as never);
    const { result } = renderHook(() => useAnalysis());
    const error = await result.current.pickAndAnalyze().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PhotoPermissionError);
    expect((error as PhotoPermissionError).source).toBe('library');
  });
});
