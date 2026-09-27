import { describe, expect, it } from '@jest/globals';

import { deletionOutcome } from './deletionOutcome';

describe('deletionOutcome', () => {
  it('reports a complete deletion only when the sign-in is gone too', () => {
    const out = deletionOutcome({ signInRemoved: true, photographsAttempted: 0, photographsRemoved: 0 });
    expect(out.title).toBe('Your account is deleted');
    expect(out.message).not.toMatch(/sign in again/);
  });

  it('does not claim the account is deleted while the sign-in still exists', () => {
    const out = deletionOutcome({ signInRemoved: false, photographsAttempted: 0, photographsRemoved: 0 });
    expect(out.title).not.toMatch(/account is deleted/i);
    expect(out.title).toBe('Your data is deleted');
    expect(out.message).toMatch(/sign in again and delete once more/);
  });

  it('mentions photographs the store could not reach', () => {
    const out = deletionOutcome({ signInRemoved: true, photographsAttempted: 3, photographsRemoved: 1 });
    expect(out.message).toMatch(/2 stored photograph\(s\) could not be reached/);
  });
});
