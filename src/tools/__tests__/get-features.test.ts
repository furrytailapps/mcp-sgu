import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getFeaturesHandler, getFeaturesInputSchema, getFeaturesTool } from '../get-features';

vi.mock('@/lib/feature-registry', () => ({
  queryFeatures: vi.fn().mockResolvedValue({
    features: [
      {
        id: 'feature-1',
        rock_type: 'Granit',
        lithology: 'Felsic plutonic rock',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [670000, 6570000],
              [680000, 6570000],
              [680000, 6590000],
              [670000, 6590000],
              [670000, 6570000],
            ],
          ],
        },
      },
    ],
    count: 1,
    numberMatched: 5,
  }),
}));

describe('get-features tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('tool definition', () => {
    it('should have correct name', () => {
      expect(getFeaturesTool.name).toBe('sgu_get_features');
    });

    it('should have description mentioning multiple data types', () => {
      expect(getFeaturesTool.description).toContain('bedrock');
      expect(getFeaturesTool.description).toContain('soil_type');
      expect(getFeaturesTool.description).toContain('wells');
    });

    it('should have dataType in input schema', () => {
      expect(getFeaturesInputSchema.dataType).toBeDefined();
    });

    it('should have flat WGS84 bbox params in input schema', () => {
      expect(getFeaturesInputSchema.minLat).toBeDefined();
      expect(getFeaturesInputSchema.minLon).toBeDefined();
      expect(getFeaturesInputSchema.maxLat).toBeDefined();
      expect(getFeaturesInputSchema.maxLon).toBeDefined();
    });

    it('should have corridor params in input schema', () => {
      expect(getFeaturesInputSchema.coordinates).toBeDefined();
      expect(getFeaturesInputSchema.bufferMeters).toBeDefined();
    });

    it('should have geometryDetail and limit in input schema', () => {
      expect(getFeaturesInputSchema.geometryDetail).toBeDefined();
      expect(getFeaturesInputSchema.limit).toBeDefined();
    });
  });

  describe('handler with bbox (WGS84)', () => {
    it('should return structured response for valid WGS84 bbox', async () => {
      const response = await getFeaturesHandler({
        dataType: 'bedrock',
        minLat: 59.25,
        minLon: 17.95,
        maxLat: 59.35,
        maxLon: 18.15,
      });

      expect(response.isError).toBeUndefined();
      const data = JSON.parse(response.content[0].text);
      expect(data.data_type).toBe('bedrock');
      expect(data.query_type).toBe('bbox');
      expect(data.coordinate_system).toBe('EPSG:3006');
      expect(data.geometry_detail).toBe('simplified');
      expect(data.count).toBeGreaterThan(0);
      expect(data.number_matched).toBeDefined();
      expect(Array.isArray(data.features)).toBe(true);
    });

    it('should return the dataType from input in response', async () => {
      const response = await getFeaturesHandler({
        dataType: 'wells',
        minLat: 59.25,
        minLon: 17.95,
        maxLat: 59.35,
        maxLon: 18.15,
      });

      expect(response.isError).toBeUndefined();
      const data = JSON.parse(response.content[0].text);
      expect(data.data_type).toBe('wells');
    });

    it('should reject coordinates outside Sweden', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});

      // Paris coordinates (outside Sweden)
      const response = await getFeaturesHandler({
        dataType: 'bedrock',
        minLat: 48.8,
        minLon: 2.3,
        maxLat: 48.9,
        maxLon: 2.4,
      });

      expect(response.isError).toBe(true);
    });

    it('should reject when maxLat < minLat', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await getFeaturesHandler({
        dataType: 'bedrock',
        minLat: 59.35,
        minLon: 17.95,
        maxLat: 59.25,
        maxLon: 18.15,
      });

      expect(response.isError).toBe(true);
    });

    it('should apply geometryDetail from input', async () => {
      const response = await getFeaturesHandler({
        dataType: 'bedrock',
        minLat: 59.25,
        minLon: 17.95,
        maxLat: 59.35,
        maxLon: 18.15,
        geometryDetail: 'none',
      });

      expect(response.isError).toBeUndefined();
      const data = JSON.parse(response.content[0].text);
      expect(data.geometry_detail).toBe('none');
    });
  });

  describe('handler with corridor (WGS84)', () => {
    it('should accept WGS84 corridor input and set query_type to corridor', async () => {
      const response = await getFeaturesHandler({
        dataType: 'bedrock',
        coordinates: [
          { latitude: 59.3, longitude: 18.0 },
          { latitude: 59.35, longitude: 18.1 },
        ],
        bufferMeters: 500,
      });

      expect(response.isError).toBeUndefined();
      const data = JSON.parse(response.content[0].text);
      expect(data.query_type).toBe('corridor');
    });
  });

  describe('validation', () => {
    it('should require either bbox or corridor', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await getFeaturesHandler({ dataType: 'bedrock' });

      expect(response.isError).toBe(true);
      const error = JSON.parse(response.content[0].text);
      expect(error.message).toContain('bbox');
    });

    it('should use default limit of 50 when not provided', async () => {
      const { queryFeatures } = await import('@/lib/feature-registry');

      const response = await getFeaturesHandler({
        dataType: 'bedrock',
        minLat: 59.25,
        minLon: 17.95,
        maxLat: 59.35,
        maxLon: 18.15,
      });

      expect(response.isError).toBeUndefined();
      expect(vi.mocked(queryFeatures)).toHaveBeenCalledWith(
        'bedrock',
        expect.any(Object),
        50,
        'simplified',
        undefined,
      );
    });

    it('should use default geometryDetail of simplified when not provided', async () => {
      const response = await getFeaturesHandler({
        dataType: 'bedrock',
        minLat: 59.25,
        minLon: 17.95,
        maxLat: 59.35,
        maxLon: 18.15,
      });

      expect(response.isError).toBeUndefined();
      const data = JSON.parse(response.content[0].text);
      expect(data.geometry_detail).toBe('simplified');
    });
  });
});
