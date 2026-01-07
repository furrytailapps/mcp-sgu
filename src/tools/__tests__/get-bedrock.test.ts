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

    it('should have bbox and corridor in input schema', () => {
      expect(getBedrockInputSchema.bbox).toBeDefined();
      expect(getBedrockInputSchema.corridor).toBeDefined();
      expect(getBedrockInputSchema.limit).toBeDefined();
    });
  });

  describe('handler with bbox', () => {
    it('should return bedrock features for valid bbox', async () => {
      const response = await getBedrockHandler({
        bbox: {
          minX: 670000,
          minY: 6570000,
          maxX: 680000,
          maxY: 6590000,
        },
      });

      expect(response.isError).toBeUndefined();
      const data = JSON.parse(response.content[0].text);
      expect(data.coordinate_system).toBe('EPSG:3006');
      expect(data.count).toBeGreaterThan(0);
      expect(Array.isArray(data.features)).toBe(true);
    });

    it('should validate bbox coordinates', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await getBedrockHandler({
        bbox: {
          minX: 680000,
          minY: 6570000,
          maxX: 670000, // Invalid: maxX < minX
          maxY: 6590000,
        },
      });

      expect(response.isError).toBe(true);
    });
  });

  describe('handler with corridor', () => {
    it('should accept corridor input', async () => {
      const response = await getBedrockHandler({
        corridor: {
          coordinates: [
            [670000, 6570000],
            [680000, 6580000],
          ],
          bufferMeters: 500,
        },
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
      expect(error.message).toContain('bbox or corridor');
    });

    it('should apply default limit', async () => {
      const response = await getBedrockHandler({
        bbox: {
          minX: 670000,
          minY: 6570000,
          maxX: 680000,
          maxY: 6590000,
        },
      });

      expect(response.isError).toBeUndefined();
    });
  });
});
