import { describe, expect, it, jest, beforeEach } from '@jest/globals';

/**
 * The service layer is where a backend rename would silently break the app, so
 * these tests pin the paths and the snake/camel bridge rather than re-testing
 * axios.
 */
const calls: { method: string; path: string; body?: unknown; params?: unknown }[] = [];
let mockResponse: unknown = {};
let mockStatus: number | undefined;

jest.mock('./api', () => ({
  get: (path: string, params?: unknown) => {
    calls.push({ method: 'get', path, params });
    return Promise.resolve(
      mockStatus ? { success: false, data: null, error: 'nope', status: mockStatus }
        : { success: true, data: mockResponse },
    );
  },
  post: (path: string, body?: unknown) => {
    calls.push({ method: 'post', path, body });
    return Promise.resolve({ success: true, data: mockResponse });
  },
  put: (path: string, body?: unknown) => {
    calls.push({ method: 'put', path, body });
    return Promise.resolve({ success: true, data: mockResponse });
  },
  patch: (path: string, body?: unknown) => {
    calls.push({ method: 'patch', path, body });
    return Promise.resolve({ success: true, data: mockResponse });
  },
  del: (path: string) => {
    calls.push({ method: 'del', path });
    return Promise.resolve({ success: true, data: null });
  },
}));

import {
  createGoal, deleteLook, getColorReport, getPassport, listLooks,
  listSeasons, saveBeautyProfile, saveLook, updateLook, updateSettings,
} from './beautyService';

describe('beautyService', () => {
  beforeEach(() => {
    calls.length = 0;
    mockResponse = {};
    mockStatus = undefined;
  });

  it('reads the colour report from the endpoint the backend serves', async () => {
    await getColorReport();
    expect(calls[0]).toMatchObject({ method: 'get', path: '/color/report' });
  });

  it('surfaces a 404 as a failed envelope rather than throwing', async () => {
    mockStatus = 404;
    const res = await getColorReport();
    expect(res.success).toBe(false);
    expect(res.status).toBe(404);
  });

  it('passes look filters as query params', async () => {
    await listLooks({ status: 'tried' });
    expect(calls[0]).toMatchObject({ method: 'get', path: '/passport/looks', params: { status: 'tried' } });
  });

  it('posts a saved look with its payload intact', async () => {
    await saveLook({ name: 'Diwali', kind: 'complete', occasion: 'festival', payload: { lipstick: 'Brick' } });
    expect(calls[0].method).toBe('post');
    expect(calls[0].path).toBe('/passport/looks');
    expect(calls[0].body).toMatchObject({ name: 'Diwali', payload: { lipstick: 'Brick' } });
  });

  it('patches a look by id', async () => {
    await updateLook('look-1', { status: 'tried' });
    expect(calls[0]).toMatchObject({ method: 'patch', path: '/passport/looks/look-1' });
  });

  it('deletes a look by id', async () => {
    await deleteLook('look-2');
    expect(calls[0]).toMatchObject({ method: 'del', path: '/passport/looks/look-2' });
  });

  it('upserts the styling profile with PUT, so partial answers merge', async () => {
    await saveBeautyProfile({ bodyType: 'pear' });
    expect(calls[0]).toMatchObject({ method: 'put', path: '/passport/profile', body: { bodyType: 'pear' } });
  });

  it('creates goals and updates settings on the passport routes', async () => {
    await createGoal({ title: 'Find a daily lipstick' });
    await updateSettings({ theme: 'dark' });
    expect(calls.map((c) => c.path)).toEqual(['/passport/goals', '/passport/settings']);
  });

  it('asks for the season reference and the passport', async () => {
    await listSeasons();
    await getPassport();
    expect(calls.map((c) => c.path)).toEqual(['/color/seasons', '/passport']);
  });
});
