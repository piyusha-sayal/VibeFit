/**
 * Cold-start handling for the API client.
 *
 * The production API sleeps when idle and takes roughly a minute to come back
 * — 62s measured on 21 September 2026. None of this fixes that: the server is
 * still asleep and the first request still waits. What this does is stop the
 * app from failing a request that would have succeeded, and tell the user what
 * is happening instead of showing a bare error.
 *
 * Retries are limited to idempotent requests. A POST or PATCH is never
 * retried, because a retried save is a duplicate saved look or a duplicate
 * goal, and a duplicate is worse than an error the user can act on.
 */

/** Long enough to cover a measured cold start with headroom. */
export const REQUEST_TIMEOUT_MS = 90_000;

/** After this long, the UI says the server is waking rather than staying silent. */
export const SLOW_REQUEST_MS = 4_000;

/** HTTP methods that can be repeated without changing server state. */
const IDEMPOTENT = new Set(['get', 'head', 'options']);

/** Statuses worth retrying: the instance is starting or a proxy gave up. */
const RETRYABLE_STATUS = new Set([502, 503, 504]);

export const MAX_RETRIES = 2;

export function isIdempotent(method: string | undefined): boolean {
  return IDEMPOTENT.has((method ?? 'get').toLowerCase());
}

export function shouldRetry(
  { method, status, isNetworkError, attempt }: {
    method: string | undefined;
    status?: number;
    isNetworkError: boolean;
    attempt: number;
  },
): boolean {
  if (attempt >= MAX_RETRIES) return false;
  if (!isIdempotent(method)) return false;
  if (isNetworkError) return true;
  return status !== undefined && RETRYABLE_STATUS.has(status);
}

/** Backoff between attempts. Short, because the wait is the server's, not ours. */
export function retryDelayMs(attempt: number): number {
  return [1_000, 3_000][attempt] ?? 3_000;
}

// ---------------------------------------------------------------- waking state

type Listener = (waking: boolean) => void;

let inFlightSlow = 0;
const listeners = new Set<Listener>();

function emit() {
  const waking = inFlightSlow > 0;
  listeners.forEach((listener) => listener(waking));
}

export function subscribeToWaking(listener: Listener): () => void {
  listeners.add(listener);
  listener(inFlightSlow > 0);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Marks a request as slow after SLOW_REQUEST_MS. Returns a function that
 * clears it — always call it, including on failure, or the banner sticks.
 */
export function trackSlowRequest(): () => void {
  let counted = false;
  const timer = setTimeout(() => {
    counted = true;
    inFlightSlow += 1;
    emit();
  }, SLOW_REQUEST_MS);

  return () => {
    clearTimeout(timer);
    if (counted) {
      inFlightSlow = Math.max(0, inFlightSlow - 1);
      emit();
    }
  };
}

/** Test seam: reset module state between cases. */
export function resetWakingState(): void {
  inFlightSlow = 0;
  listeners.clear();
}
