import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getBedrockHandler, getBedrockInputSchema, getBedrockTool } from '../get-bedrock';

vi.mock('@/clients/sgu-client', () => ({
  sguClient: {
    getBedrock: vi.fn().mockResolvedValue({
      features: [
        {
          id: 'feature-1',
          rock_type: 'Granit',
          lithology: 'Felsic plutonic rock',
          geological_unit: 'Uppland granite',
          tectonic_unit: 'Fennoscandian Shield',
          age_period: 'Proterozoic',
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
      usedPolygonFilter: false,
    }),
  },
}));

describe('get-bedrock tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('tool definition', () => {
    it('should have correct name', () => {
      expect(getBedrockTool.name).toBe('sgu_get_bedrock');
    });

    it('should have description mentioning bedrock geology', () => {
      expect(getBedrockTool.description).toContain('bedrock');
      expect(getBedrockTool.description).toContain('geology');
    });

    it('should have flat WGS84 bbox and corridor params in input schema', () => {
      expect(getBedrockInputSchema.minLat).toBeDefined();
      expect(getBedrockInputSchema.minLon).toBeDefined();
      expect(getBedrockInputSchema.maxLat).toBeDefined();
      expect(getBedrockInputSchema.maxLon).toBeDefined();
      expect(getBedrockInputSchema.coordinates).toBeDefined();
      expect(getBedrockInputSchema.bufferMeters).toBeDefined();
      expect(getBedrockInputSchema.limit).toBeDefined();
    });
  });

  describe('handler with bbox (WGS84)', () => {
    it('should return bedrock features for valid WGS84 bbox', async () => {
      // Stockholm area in WGS84
      const response = await getBedrockHandler({
        minLat: 59.25,
        minLon: 17.95,
        maxLat: 59.35,
        maxLon: 18.15,
      });

      expect(response.isError).toBeUndefined();
      const data = JSON.parse(response.content[0].text);
      expect(data.input_coordinate_system).toBe('EPSG:4326');
      expect(data.internal_coordinate_system).toBe('EPSG:3006');
      expect(data.count).toBeGreaterThan(0);
      expect(Array.isArray(data.features)).toBe(true);
    });

    it('should validate WGS84 bbox coordinates', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});

      // Invalid: maxLat < minLat
      const response = await getBedrockHandler({
        minLat: 59.35,
        minLon: 17.95,
        maxLat: 59.25,
        maxLon: 18.15,
      });

      expect(response.isError).toBe(true);
    });

    it('should reject coordinates outside Sweden', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});

      // Paris coordinates (outside Sweden)
      const response = await getBedrockHandler({
        minLat: 48.8,
        minLon: 2.3,
        maxLat: 48.9,
        maxLon: 2.4,
      });

      expect(response.isError).toBe(true);
    });
  });

  describe('handler with corridor (WGS84)', () => {
    it('should accept WGS84 corridor input', async () => {
      const response = await getBedrockHandler({
        coordinates: [
          { latitude: 59.3, longitude: 18.0 },
          { latitude: 59.35, longitude: 18.1 },
        ],
        bufferMeters: 500,
      });

      expect(response.isError).toBeUndefined();
    });
  });

  describe('validation', () => {
    it('should require either bbox or corridor', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await getBedrockHandler({});

      expect(response.isError).toBe(true);
      const error = JSON.parse(response.content[0].text);
      expect(error.message).toContain('bbox');
    });

    it('should apply default limit', async () => {
      const response = await getBedrockHandler({
        minLat: 59.25,
        minLon: 17.95,
        maxLat: 59.35,
        maxLon: 18.15,
      });

      expect(response.isError).toBeUndefined();
    });
  });
});
