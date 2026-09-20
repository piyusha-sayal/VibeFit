import { describe, it, expect, jest, afterEach } from '@jest/globals';
import { Platform } from 'react-native';

jest.mock('./authService', () => ({ getFreshIdToken: async () => null }));

import { buildUploadForm } from './api';

const originalOS = Platform.OS;
const originalFetch = global.fetch;

afterEach(() => {
  Platform.OS = originalOS;
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

describe('buildUploadForm', () => {
  it('appends the native file descriptor on iOS/Android', async () => {
    Platform.OS = 'android';
    const append = jest.spyOn(FormData.prototype, 'append');

    await buildUploadForm('file:///photo.jpg', 'image/jpeg');

    expect(append).toHaveBeenCalledWith('file', { uri: 'file:///photo.jpg', type: 'image/jpeg', name: 'upload' });
  });

  // Browsers stringify a plain object to "[object Object]", so the backend saw
  // no file and answered 422. The web picker returns a data:/blob: URI.
  it('appends a real Blob with a filename on web', async () => {
    Platform.OS = 'web';
    const blob = new Blob(['jpeg-bytes'], { type: 'image/jpeg' });
    global.fetch = jest.fn(async () => ({ blob: async () => blob })) as unknown as typeof fetch;
    const append = jest.spyOn(FormData.prototype, 'append').mockImplementation(() => undefined);

    await buildUploadForm('data:image/jpeg;base64,AAAA', 'image/jpeg');

    expect(global.fetch).toHaveBeenCalledWith('data:image/jpeg;base64,AAAA');
    const [field, value, filename] = append.mock.calls[0] as unknown as [string, Blob, string];
    expect(field).toBe('file');
    expect(value).toBeInstanceOf(Blob);
    expect(value.type).toBe('image/jpeg');
    expect(filename).toBe('upload.jpeg');
  });
});
