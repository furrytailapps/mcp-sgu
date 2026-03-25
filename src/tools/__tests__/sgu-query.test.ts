import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock data-registry
vi.mock('@/lib/data-registry', () => ({
  queryAll: vi.fn(),
}));

import { sguQueryTool, sguQueryHandler } from '../sgu-query';
import { queryAll } from '@/lib/data-registry';

// ============================================================================
// Tests
// ============================================================================

describe('sguQueryTool', () => {
  it('has correct name', () => {
    expect(sguQueryTool.name).toBe('sgu_query');
  });

  it('has all required input schema keys', () => {
    expect(sguQueryTool.inputSchema).toHaveProperty('dataTypes');
    expect(sguQueryTool.inputSchema).toHaveProperty('points');
    expect(sguQueryTool.inputSchema).toHaveProperty('radiusKm');
    expect(sguQueryTool.inputSchema).toHaveProperty('geometryDetail');
    expect(sguQueryTool.inputSchema).toHaveProperty('limit');
  });
});

describe('sguQueryHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(queryAll).mockResolvedValue({
      results: { bedrock: [{ rock_type: 'Granit' }] },
      errors: {},
    });
  });

  it('validates that at least one point is required', async () => {
    const result = await sguQueryHandler({
      dataTypes: ['bedrock'],
      points: [],
    });

    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text)).toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });

  it('validates points are within Sweden bounds', async () => {
    const result = await sguQueryHandler({
      dataTypes: ['bedrock'],
      points: [{ latitude: 40.0, longitude: 18.0 }],
    });

    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).message).toContain('outside Sweden');
  });

  it('accepts valid Stockholm coordinates', async () => {
    const result = await sguQueryHandler({
      dataTypes: ['bedrock'],
      points: [{ latitude: 59.33, longitude: 18.07 }],
    });

    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.bedrock).toHaveLength(1);
  });

  it('expands "all" to all 9 types', async () => {
    await sguQueryHandler({
      dataTypes: 'all',
      points: [{ latitude: 59.33, longitude: 18.07 }],
    });

    expect(queryAll).toHaveBeenCalledWith(
      expect.arrayContaining([
        'bedrock',
        'soil_type',
        'groundwater_aquifers',
        'wells',
        'soil_layers',
        'radon_risk',
        'soil_depth',
        'groundwater_vulnerability',
        'landslide',
      ]),
      expect.any(Object),
      expect.any(Array),
      50,
      'simplified',
    );
    const calledTypes = vi.mocked(queryAll).mock.calls[0][0];
    expect(calledTypes).toHaveLength(9);
  });

  it('uses default radiusKm=0.2', async () => {
    const result = await sguQueryHandler({
      dataTypes: ['bedrock'],
      points: [{ latitude: 59.33, longitude: 18.07 }],
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.query.radiusKm).toBe(0.2);
  });

  it('uses default geometryDetail=simplified', async () => {
    await sguQueryHandler({
      dataTypes: ['bedrock'],
      points: [{ latitude: 59.33, longitude: 18.07 }],
    });

    expect(queryAll).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Object),
      expect.any(Array),
      50,
      'simplified',
    );
  });

  it('uses default limit=50', async () => {
    await sguQueryHandler({
      dataTypes: ['bedrock'],
      points: [{ latitude: 59.33, longitude: 18.07 }],
    });

    expect(queryAll).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Object),
      expect.any(Array),
      50,
      expect.any(String),
    );
  });

  it('passes custom parameters through', async () => {
    await sguQueryHandler({
      dataTypes: ['bedrock', 'radon_risk'],
      points: [{ latitude: 59.33, longitude: 18.07 }],
      radiusKm: 1.0,
      geometryDetail: 'none',
      limit: 10,
    });

    expect(queryAll).toHaveBeenCalledWith(
      ['bedrock', 'radon_risk'],
      expect.any(Object),
      expect.any(Array),
      10,
      'none',
    );
  });

  it('response includes query metadata (points, radiusKm, bbox)', async () => {
    const result = await sguQueryHandler({
      dataTypes: ['bedrock'],
      points: [{ latitude: 59.33, longitude: 18.07 }],
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.query).toBeDefined();
    expect(data.query.points).toEqual([{ latitude: 59.33, longitude: 18.07 }]);
    expect(data.query.radiusKm).toBe(0.2);
    expect(data.query.bbox).toHaveProperty('minLat');
    expect(data.query.bbox).toHaveProperty('maxLon');
  });

  it('includes errors key when partial failure', async () => {
    vi.mocked(queryAll).mockResolvedValue({
      results: { bedrock: [{ rock_type: 'Granit' }] },
      errors: { radon_risk: 'WMS service unavailable' },
    });

    const result = await sguQueryHandler({
      dataTypes: ['bedrock', 'radon_risk'],
      points: [{ latitude: 59.33, longitude: 18.07 }],
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.errors).toEqual({ radon_risk: 'WMS service unavailable' });
    expect(data.bedrock).toHaveLength(1);
  });

  it('omits errors key when no failures', async () => {
    const result = await sguQueryHandler({
      dataTypes: ['bedrock'],
      points: [{ latitude: 59.33, longitude: 18.07 }],
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.errors).toBeUndefined();
  });
});
