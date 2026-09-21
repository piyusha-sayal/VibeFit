/**
 * The retry policy.
 *
 * The property that matters most: a save is never repeated. A duplicate saved
 * look is worse than an error the user can retry themselves.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';

import {
  MAX_RETRIES, REQUEST_TIMEOUT_MS, isIdempotent, resetWakingState, retryDelayMs,
  shouldRetry, subscribeToWaking, trackSlowRequest,
} from './coldStart';

afterEach(() => {
  resetWakingState();
  jest.useRealTimers();
});

describe('what may be retried', () => {
  it('never retries a non-idempotent request, whatever went wrong', () => {
    for (const method of ['post', 'patch', 'delete', 'POST', 'PATCH']) {
      expect(shouldRetry({ method, isNetworkError: true, attempt: 0 })).toBe(false);
      expect(shouldRetry({ method, status: 503, isNetworkError: false, attempt: 0 })).toBe(false);
    }
  });

  it('retries a GET that never reached the server', () => {
    expect(shouldRetry({ method: 'get', isNetworkError: true, attempt: 0 })).toBe(true);
  });

  it('retries a GET when the instance is starting', () => {
    for (const status of [502, 503, 504]) {
      expect(shouldRetry({ method: 'get', status, isNetworkError: false, attempt: 0 })).toBe(true);
    }
  });

  it('does not retry a GET that failed for a real reason', () => {
    for (const status of [400, 401, 403, 404, 422, 500]) {
      expect(shouldRetry({ method: 'get', status, isNetworkError: false, attempt: 0 })).toBe(false);
    }
  });

  it('gives up after a bounded number of attempts', () => {
    expect(shouldRetry({ method: 'get', isNetworkError: true, attempt: MAX_RETRIES })).toBe(false);
    expect(retryDelayMs(0)).toBeLessThan(retryDelayMs(1));
  });

  it('treats an unspecified method as a GET', () => {
    expect(isIdempotent(undefined)).toBe(true);
  });
});

describe('timeout', () => {
  it('covers the measured cold start with headroom', () => {
    // 62.5s measured against production on 21 September 2026.
    expect(REQUEST_TIMEOUT_MS).toBeGreaterThan(62_500);
  });
});

describe('waking state', () => {
  it('stays quiet for a request that finishes quickly', () => {
    jest.useFakeTimers();
    const seen: boolean[] = [];
    subscribeToWaking((w) => seen.push(w));

    const done = trackSlowRequest();
    jest.advanceTimersByTime(500);
    done();

    expect(seen).toEqual([false]);
  });

  it('announces a slow request and clears when it finishes', () => {
    jest.useFakeTimers();
    const seen: boolean[] = [];
    subscribeToWaking((w) => seen.push(w));

    const done = trackSlowRequest();
    jest.advanceTimersByTime(10_000);
    expect(seen[seen.length - 1]).toBe(true);

    done();
    expect(seen[seen.length - 1]).toBe(false);
  });

  it('stays announced until the last slow request finishes', () => {
    jest.useFakeTimers();
    const seen: boolean[] = [];
    subscribeToWaking((w) => seen.push(w));

    const first = trackSlowRequest();
    const second = trackSlowRequest();
    jest.advanceTimersByTime(10_000);

    first();
    expect(seen[seen.length - 1]).toBe(true);
    second();
    expect(seen[seen.length - 1]).toBe(false);
  });
});
