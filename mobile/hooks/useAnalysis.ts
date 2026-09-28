import { useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useAnalysisStore } from '../store/analysisStore';
import { PhotoPermissionError } from '../utils/photoPermission';

export function useAnalysis() {
  const store = useAnalysisStore();

  useEffect(() => {
    store.loadLatest();
  }, []);

  const pickAndAnalyze = async () => {
    const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') throw new PhotoPermissionError('library', canAskAgain);

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.92,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      return store.upload(asset.uri, asset.mimeType ?? 'image/jpeg');
    }
    return null;
  };

  const cameraAndAnalyze = async () => {
    const { status, canAskAgain } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') throw new PhotoPermissionError('camera', canAskAgain);

    // A selfie: open the front camera rather than whatever the phone last used.
    const result = await ImagePicker.launchCameraAsync({
      cameraType: ImagePicker.CameraType.front,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.92,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      return store.upload(asset.uri, asset.mimeType ?? 'image/jpeg');
    }
    return null;
  };

  return {
    currentAnalysis: store.currentAnalysis,
    analyses: store.analyses,
    isUploading: store.isUploading,
    uploadProgress: store.uploadProgress,
    isAnalyzing: store.isAnalyzing,
    error: store.error,
    pickAndAnalyze,
    cameraAndAnalyze,
    loadAll: store.loadAll,
    clearError: store.clearError,
  };
}
