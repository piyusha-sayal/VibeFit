/**
 * The face and studio client: query shapes, and the properties the UI relies on.
 *
 * The API module is mocked, so these assert what this layer sends and returns,
 * not what the network does.
 */
import * as api from './api';
import * as faceService from './faceService';

jest.mock('./api', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  del: jest.fn(),
}));

const mockGet = api.get as jest.Mock;
const mockPut = api.put as jest.Mock;
const mockPost = api.post as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue({ success: true, data: {}, status: 200 });
  mockPut.mockResolvedValue({ success: true, data: {}, status: 200 });
  mockPost.mockResolvedValue({ success: true, data: {}, status: 200 });
});

describe('hairstyle filters', () => {
  it('sends nothing when no filter is set, so the API returns the full library', async () => {
    await faceService.getHairstyles();
    expect(mockGet).toHaveBeenCalledWith('/hair/styles', {});
  });

  it('only sends the filters that are actually set', async () => {
    await faceService.getHairstyles({ texture: 'coily', maintenance: 'low' });
    expect(mockGet).toHaveBeenCalledWith('/hair/styles', { texture: 'coily', maintenance: 'low' });
  });

  it('sends protective_only only when true, never as false', async () => {
    await faceService.getHairstyles({ protectiveOnly: false });
    expect(mockGet).toHaveBeenCalledWith('/hair/styles', {});

    await faceService.getHairstyles({ protectiveOnly: true });
    expect(mockGet).toHaveBeenLastCalledWith('/hair/styles', { protective_only: true });
  });

  it('passes a time budget through as max_minutes', async () => {
    await faceService.getHairstyles({ maxMinutes: 10 });
    expect(mockGet).toHaveBeenCalledWith('/hair/styles', { max_minutes: 10 });
  });
});

describe('face attributes', () => {
  it('puts the chosen value on the attribute endpoint', async () => {
    await faceService.setFaceAttribute('eye_shape', 'hooded');
    expect(mockPut).toHaveBeenCalledWith('/face/attributes/eye_shape', { value: 'hooded' });
  });

  it('puts a shape override on its own endpoint, not the attribute one', async () => {
    await faceService.setFaceShape('oblong');
    expect(mockPut).toHaveBeenCalledWith('/face/shape', { value: 'oblong' });
  });
});

describe('guide progress', () => {
  it('sends a partial update, so an unrelated field is never overwritten', async () => {
    await faceService.updateGuideProgress('colour-basics', { lastStep: 3 });
    expect(mockPut).toHaveBeenCalledWith('/guides/progress/colour-basics', { lastStep: 3 });
  });

  it('syncs additively — it never sends a list of things to clear', async () => {
    await faceService.syncGuideProgress(['a', 'b'], []);
    expect(mockPost).toHaveBeenCalledWith('/guides/progress/sync', {
      completed: ['a', 'b'],
      saved: [],
    });
  });
});

describe('optional query params', () => {
  it('omits the param entirely rather than sending undefined', async () => {
    await faceService.getBangs();
    expect(mockGet).toHaveBeenCalledWith('/hair/bangs', undefined);

    await faceService.getHairColours();
    expect(mockGet).toHaveBeenLastCalledWith('/hair/colours', undefined);
  });

  it('sends the occasion only when one is chosen', async () => {
    await faceService.getMakeupLook('soft_glam');
    expect(mockGet).toHaveBeenCalledWith('/makeup/looks/soft_glam', undefined);

    await faceService.getMakeupLook('soft_glam', 'wedding');
    expect(mockGet).toHaveBeenLastCalledWith('/makeup/looks/soft_glam', { occasion: 'wedding' });
  });
});
