import { describe, expect, it } from '@jest/globals';

import { PhotoPermissionError, photoPermissionAlert } from './photoPermission';

describe('photoPermissionAlert', () => {
  it('offers Settings when Android will not ask again', () => {
    const alert = photoPermissionAlert(new PhotoPermissionError('camera', false));
    expect(alert.title).toBe('Camera access is off');
    expect(alert.message).toMatch(/Settings/);
    expect(alert.offerSettings).toBe(true);
  });

  it('just explains when the user can be asked again', () => {
    const alert = photoPermissionAlert(new PhotoPermissionError('library', true));
    expect(alert.title).toBe('Photo access is off');
    expect(alert.offerSettings).toBe(false);
  });
});
