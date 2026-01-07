import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSoilTypesMapHandler, getSoilTypesMapInputSchema, getSoilTypesMapTool } from '../get-soil-types-map';

vi.mock('@/clients/sgu-client', () => ({
  sguClient: {
    getSoilTypesMapUrl: vi.fn().mockReturnValue({
      map_url: 'https://maps.sgu.se/mock-soil-map-url',
      legend_url: 'https://maps.sgu.se/mock-soil-legend-url',
      bbox: { minX: 670000, minY: 6570000, maxX: 680000, maxY: 6590000 },
      coordinate_system: 'EPSG:3006',
      layers: ['SE.GOV.SGU.JORD.GRUNDLAGER.25K'],
    }),
  },
}));

describe('get-soil-types-map tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('tool definition', () => {
    it('should have correct name', () => {
      expect(getSoilTypesMapTool.name).toBe('sgu_get_soil_types_map');
    });

    it('should have description mentioning soil types', () => {
      expect(getSoilTypesMapTool.description).toContain('soil');
      expect(getSoilTypesMapTool.description).toContain('SWEREF99TM');
    });

    it('should have required input schema fields', () => {
      expect(getSoilTypesMapInputSchema.bbox).toBeDefined();
      expect(getSoilTypesMapInputSchema.corridor).toBeDefined();
    });
  });

  describe('handler', () => {
    it('should return map URLs for valid bbox', async () => {
      const response = await getSoilTypesMapHandler({
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
    });

    it('should require either bbox or corridor', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await getSoilTypesMapHandler({});

      expect(response.isError).toBe(true);
    });
  });
});
