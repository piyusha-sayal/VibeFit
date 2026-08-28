import { useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useAnalysisStore } from '../store/analysisStore';

export function useAnalysis() {
  const store = useAnalysisStore();

  useEffect(() => {
    store.loadLatest();
  }, []);

  const pickAndAnalyze = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') throw new Error('Photo library permission required');

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') throw new Error('Camera permission required');

    const result = await ImagePicker.launchCameraAsync({
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
