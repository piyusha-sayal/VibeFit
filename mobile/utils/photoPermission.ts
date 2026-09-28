/**
 * A refused camera or photo permission. When Android will no longer show its
 * own prompt, the only way back is the system Settings screen, so the alert
 * offers it instead of leaving the user at a dead end.
 */
export type PhotoSource = 'camera' | 'library';

export class PhotoPermissionError extends Error {
  constructor(public readonly source: PhotoSource, public readonly canAskAgain: boolean) {
    super(source === 'camera' ? 'Camera permission required' : 'Photo library permission required');
    this.name = 'PhotoPermissionError';
  }
}

export function photoPermissionAlert(error: PhotoPermissionError): {
  title: string; message: string; offerSettings: boolean;
} {
  const what = error.source === 'camera' ? 'the camera' : 'your photos';
  const title = error.source === 'camera' ? 'Camera access is off' : 'Photo access is off';
  if (!error.canAskAgain) {
    return {
      title,
      message: `MyLookFit needs ${what} to analyse a selfie. Turn it on in Settings, then try again.`,
      offerSettings: true,
    };
  }
  return { title, message: `MyLookFit needs ${what} to analyse a selfie. Please allow it when asked.`, offerSettings: false };
}
