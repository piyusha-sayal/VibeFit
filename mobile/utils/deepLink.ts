/**
 * Normalises links that open the app. mylookfit:// is the public scheme;
 * vibefit:// is still accepted so links from earlier builds keep working.
 * Anything else (the Google sign-in callback, plain router paths) is passed
 * through unchanged, and a malformed app link lands on the root rather than
 * on an unmatched-route screen.
 */
const APP_SCHEMES = ['mylookfit', 'vibefit'];
const SCHEME_PATTERN = /^([a-z][a-z0-9+.-]*):\/\/(.*)$/i;
const ROOT = '/';

function isSafePath(path: string): boolean {
  let decoded: string;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    return false;
  }
  const hasControlChar = [...decoded].some((ch) => ch.charCodeAt(0) < 0x20);
  if (decoded.includes('\\') || hasControlChar) return false;
  return !decoded.split('/').some((segment) => segment === '..');
}

export function resolveIncomingLink(url: string): string {
  if (!url) return ROOT;
  const match = SCHEME_PATTERN.exec(url);
  if (!match || !APP_SCHEMES.includes(match[1].toLowerCase())) return url;

  const path = `/${match[2]}`.replace(/\/{2,}/g, '/');
  if (!isSafePath(path)) return ROOT;
  return path.length > 1 ? path.replace(/\/(?=\?|$)/, '') : ROOT;
}
