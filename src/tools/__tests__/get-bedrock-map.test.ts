import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getBedrockMapHandler, getBedrockMapInputSchema, getBedrockMapTool } from '../get-bedrock-map';

// Mock the sguClient module
vi.mock('@/clients/sgu-client', () => ({
  sguClient: {
    getBedrockMapUrl: vi.fn().mockReturnValue({
      map_url: 'https://maps.sgu.se/mock-map-url',
      legend_url: 'https://maps.sgu.se/mock-legend-url',
      bbox: { minX: 670000, minY: 6570000, maxX: 680000, maxY: 6590000 },
      coordinate_system: 'EPSG:3006',
      layers: ['SE.GOV.SGU.BERG.GEOLOGISK_ENHET.YTA.50K'],
    }),
  },
}));

describe('get-bedrock-map tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('tool definition', () => {
    it('should have correct name', () => {
      expect(getBedrockMapTool.name).toBe('sgu_get_bedrock_map');
    });

    it('should have description mentioning bedrock and coordinates', () => {
      expect(getBedrockMapTool.description).toContain('bedrock');
      expect(getBedrockMapTool.description).toContain('SWEREF99TM');
    });

    it('should have input schema with bbox and corridor', () => {
      expect(getBedrockMapInputSchema.bbox).toBeDefined();
      expect(getBedrockMapInputSchema.corridor).toBeDefined();
      expect(getBedrockMapInputSchema.width).toBeDefined();
      expect(getBedrockMapInputSchema.height).toBeDefined();
      expect(getBedrockMapInputSchema.format).toBeDefined();
    });
  });

  describe('handler with bbox', () => {
    it('should return map URLs for valid bbox', async () => {
      const response = await getBedrockMapHandler({
        bbox: {
          minX: 670000,
          minY: 6570000,
          maxX: 680000,
          maxY: 6590000,
        },
      });

      expect(response.isError).toBeUndefined();
      const data = JSON.parse(response.content[0].text);
      expect(data.map_url).toContain('https://');
      expect(data.legend_url).toContain('https://');
      expect(data.coordinate_system).toBe('EPSG:3006');
    });

    it('should validate bbox coordinates', async () => {
      // Suppress console.error
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await getBedrockMapHandler({
        bbox: {
          minX: 680000, // Invalid: minX > maxX
          minY: 6570000,
          maxX: 670000,
          maxY: 6590000,
        },
      });

      expect(response.isError).toBe(true);
      const error = JSON.parse(response.content[0].text);
      expect(error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('handler with corridor', () => {
    it('should accept corridor input', async () => {
      const response = await getBedrockMapHandler({
        corridor: {
          coordinates: [
            { x: 670000, y: 6570000 },
            { x: 680000, y: 6580000 },
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

      const response = await getBedrockMapHandler({});

      expect(response.isError).toBe(true);
      const error = JSON.parse(response.content[0].text);
      expect(error.message).toContain('bbox or corridor');
    });

    it('should reject coordinates outside Sweden', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await getBedrockMapHandler({
        bbox: {
          minX: 100000, // Outside Sweden
          minY: 6570000,
          maxX: 110000,
          maxY: 6590000,
        },
      });

      expect(response.isError).toBe(true);
    });
  });
});
