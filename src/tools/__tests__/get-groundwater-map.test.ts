import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getGroundwaterMapHandler, getGroundwaterMapInputSchema, getGroundwaterMapTool } from '../get-groundwater-map';

vi.mock('@/clients/sgu-client', () => ({
  sguClient: {
    getGroundwaterMapUrl: vi.fn().mockReturnValue({
      map_url: 'https://maps.sgu.se/mock-groundwater-map-url',
      legend_url: 'https://maps.sgu.se/mock-groundwater-legend-url',
      bbox: { minX: 670000, minY: 6570000, maxX: 680000, maxY: 6590000 },
      coordinate_system: 'EPSG:3006',
      layers: ['SE.GOV.SGU.HMAG.GRUNDVATTENMAGASIN_J1.V2'],
    }),
  },
}));

describe('get-groundwater-map tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('tool definition', () => {
    it('should have correct name', () => {
      expect(getGroundwaterMapTool.name).toBe('sgu_get_groundwater_map');
    });

    it('should have description mentioning groundwater', () => {
      expect(getGroundwaterMapTool.description).toContain('groundwater');
      expect(getGroundwaterMapTool.description).toContain('SWEREF99TM');
    });

    it('should have required input schema fields', () => {
      expect(getGroundwaterMapInputSchema.minX).toBeDefined();
      expect(getGroundwaterMapInputSchema.coordinates).toBeDefined();
    });
  });

  describe('handler', () => {
    it('should return map URLs for valid bbox', async () => {
      const response = await getGroundwaterMapHandler({
        minX: 670000,
        minY: 6570000,
        maxX: 680000,
        maxY: 6590000,
      });

      expect(response.isError).toBeUndefined();
      const data = JSON.parse(response.content[0].text);
      expect(data.map_url).toBeDefined();
      expect(data.legend_url).toBeDefined();
      expect(data.layers).toContain('SE.GOV.SGU.HMAG.GRUNDVATTENMAGASIN_J1.V2');
    });

    it('should accept corridor input', async () => {
      const response = await getGroundwaterMapHandler({
        coordinates: [
          { x: 670000, y: 6570000 },
          { x: 680000, y: 6580000 },
        ],
        bufferMeters: 500,
      });

      expect(response.isError).toBeUndefined();
    });

    it('should require either bbox or corridor', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await getGroundwaterMapHandler({});

      expect(response.isError).toBe(true);
    });
  });
});
