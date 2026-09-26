import { resolveIncomingLink } from '../utils/deepLink';

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return resolveIncomingLink(path);
}
