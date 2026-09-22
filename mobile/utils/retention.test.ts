import { describe, expect, it } from '@jest/globals';

import type { PhotoConsent, PhotoList } from '../services/privacyService';
import { consentOutlivesCapability, retentionStatus } from './retention';

const NOTE = 'Photograph storage is not configured on this deployment…';

function consent(over: Partial<PhotoConsent> = {}): PhotoConsent {
  return {
    photoRetentionConsent: false,
    photoReuseConsent: false,
    storageAvailable: true,
    retentionEffective: false,
    reuseEffective: false,
    retentionNote: 'backups note',
    storageNote: null,
    ...over,
  };
}

function photos(over: Partial<PhotoList> = {}): PhotoList {
  return {
    photos: [],
    storedCount: 0,
    storageAvailable: true,
    retentionNote: 'backups note',
    storageNote: null,
    ...over,
  };
}

describe('retentionStatus', () => {
  it('reads off and says the photograph goes, by default', () => {
    const status = retentionStatus(consent(), photos());
    expect(status.retentionOn).toBe(false);
    expect(status.retentionEnabled).toBe(true);
    expect(status.summary).toContain('deleted as soon as the analysis finishes');
    expect(status.note).toBeNull();
  });

  it('reads on only when consent and storage agree', () => {
    const status = retentionStatus(
      consent({ photoRetentionConsent: true, retentionEffective: true }), photos(),
    );
    expect(status.retentionOn).toBe(true);
    expect(status.summary).toContain('is kept after an analysis');
  });

  it('shows the switch off and locked when there is nowhere to store', () => {
    // The failure this guards: a switch reading "on" while the server keeps
    // nothing, because the stored flag outlived the bucket.
    const status = retentionStatus(
      consent({
        photoRetentionConsent: true,
        retentionEffective: false,
        storageAvailable: false,
        storageNote: NOTE,
      }),
      photos({ storageAvailable: false, storageNote: NOTE }),
    );
    expect(status.retentionOn).toBe(false);
    expect(status.retentionEnabled).toBe(false);
    expect(status.note).toBe(NOTE);
    expect(status.summary).toContain('storage is unavailable');
  });

  it('takes the answer from the photo list when consent has not loaded', () => {
    const status = retentionStatus(null, photos({
      storageAvailable: false, storageNote: NOTE,
    }));
    expect(status.storageAvailable).toBe(false);
    expect(status.note).toBe(NOTE);
  });

  it('assumes available rather than warning about nothing', () => {
    expect(retentionStatus(null, null).storageAvailable).toBe(true);
    expect(retentionStatus(null, null).note).toBeNull();
  });

  it('never lets reuse be touched without retention in effect', () => {
    const noRetention = retentionStatus(consent({ photoReuseConsent: true }), photos());
    expect(noRetention.reuseEnabled).toBe(false);
    expect(noRetention.reuseOn).toBe(false);

    const both = retentionStatus(consent({
      photoRetentionConsent: true, retentionEffective: true,
      photoReuseConsent: true, reuseEffective: true,
    }), photos());
    expect(both.reuseEnabled).toBe(true);
    expect(both.reuseOn).toBe(true);
  });

  it('locks both switches while a change is in flight', () => {
    const status = retentionStatus(
      consent({ photoRetentionConsent: true, retentionEffective: true }),
      photos(), true,
    );
    expect(status.retentionEnabled).toBe(false);
    expect(status.reuseEnabled).toBe(false);
  });
});

describe('consentOutlivesCapability', () => {
  it('spots a recorded consent the deployment can no longer honour', () => {
    expect(consentOutlivesCapability(consent({
      photoRetentionConsent: true, storageAvailable: false,
    }))).toBe(true);
  });

  it('is false when there was never consent, or storage still works', () => {
    expect(consentOutlivesCapability(consent({ storageAvailable: false }))).toBe(false);
    expect(consentOutlivesCapability(consent({
      photoRetentionConsent: true,
    }))).toBe(false);
    expect(consentOutlivesCapability(null)).toBe(false);
  });
});
