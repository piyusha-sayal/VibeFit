/**
 * Four separate facts about a photograph, kept apart on purpose.
 *
 * Whether the analysis processed one, whether the person consented to it being
 * kept, whether this deployment can keep it, and whether one is actually
 * there. The privacy screen used to show a single switch, which meant the
 * first two could read as all four. Production has no object storage, so a
 * switch reading "on" would have been a promise nothing could keep.
 */
import type { PhotoConsent, PhotoList } from '../services/privacyService';

export interface RetentionStatus {
  /** Can this deployment keep a photograph at all? */
  storageAvailable: boolean;
  /** What the retention switch should read — capability included. */
  retentionOn: boolean;
  /** Whether that switch can be touched. */
  retentionEnabled: boolean;
  reuseOn: boolean;
  reuseEnabled: boolean;
  /** Shown beside the switches when storage cannot honour them. */
  note: string | null;
  /** One line stating what happens to a photograph, in every case. */
  summary: string;
}

const KEPT =
  'Your photograph is kept after an analysis until you delete it or withdraw consent.';
const DISCARDED =
  'Your photograph is deleted as soon as the analysis finishes. The results stay.';
const UNAVAILABLE =
  'Photograph storage is unavailable, so your photograph is always deleted as '
  + 'soon as the analysis finishes. The results stay.';

export function retentionStatus(
  consent: PhotoConsent | null,
  photos: PhotoList | null,
  busy = false,
): RetentionStatus {
  // Either endpoint can answer this; it is a fact about the server, not the
  // account. Absent both, assume available rather than showing a warning we
  // have not been told to show.
  const storageAvailable =
    consent?.storageAvailable ?? photos?.storageAvailable ?? true;
  const retentionOn = !!consent?.retentionEffective;
  const reuseOn = !!consent?.reuseEffective;

  return {
    storageAvailable,
    retentionOn,
    retentionEnabled: storageAvailable && !busy,
    reuseOn,
    // Reuse cannot outlive retention: there would be nothing to reuse.
    reuseEnabled: storageAvailable && retentionOn && !busy,
    note: storageAvailable ? null : consent?.storageNote || photos?.storageNote || null,
    summary: !storageAvailable ? UNAVAILABLE : retentionOn ? KEPT : DISCARDED,
  };
}

/**
 * True when the person asked for retention on a deployment that later lost the
 * ability to provide it. Their stored answer is untouched; what they see is
 * not. Worth saying out loud rather than silently flipping their switch off.
 */
export function consentOutlivesCapability(consent: PhotoConsent | null): boolean {
  return !!consent && consent.photoRetentionConsent && !consent.storageAvailable;
}
