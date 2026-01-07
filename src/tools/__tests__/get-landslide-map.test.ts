import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getLandslideMapHandler, getLandslideMapInputSchema, getLandslideMapTool } from '../get-landslide-map';

vi.mock('@/clients/sgu-client', () => ({
  sguClient: {
    getLandslideMapUrl: vi.fn().mockReturnValue({
      map_url: 'https://maps.sgu.se/mock-landslide-map-url',
      legend_url: 'https://maps.sgu.se/mock-landslide-legend-url',
      bbox: { minX: 670000, minY: 6570000, maxX: 680000, maxY: 6590000 },
      coordinate_system: 'EPSG:3006',
      layers: ['SE.GOV.SGU.JORD.SKRED'],
    }),
  },
}));

describe('get-landslide-map tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('tool definition', () => {
    it('should have correct name', () => {
      expect(getLandslideMapTool.name).toBe('sgu_get_landslide_map');
    });

    it('should have description mentioning landslide', () => {
      expect(getLandslideMapTool.description).toContain('landslide');
      expect(getLandslideMapTool.description).toContain('SWEREF99TM');
    });

    it('should have required input schema fields', () => {
      expect(getLandslideMapInputSchema.bbox).toBeDefined();
      expect(getLandslideMapInputSchema.corridor).toBeDefined();
    });
  });

  describe('handler', () => {
    it('should return map URLs for valid bbox', async () => {
      const response = await getLandslideMapHandler({
        bbox: {
          minX: 670000,
          minY: 6570000,
          maxX: 680000,
          maxY: 6590000,
        },
      });

      expect(response.isError).toBeUndefined();
      const data = JSON.parse(response.content[0].text);
      expect(data.map_url).toBeDefined();
      expect(data.legend_url).toBeDefined();
      expect(data.layers).toContain('SE.GOV.SGU.JORD.SKRED');
    });

    it('should accept corridor input', async () => {
      const response = await getLandslideMapHandler({
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

    it('should require either bbox or corridor', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await getLandslideMapHandler({});

      expect(response.isError).toBe(true);
    });
  });
});
