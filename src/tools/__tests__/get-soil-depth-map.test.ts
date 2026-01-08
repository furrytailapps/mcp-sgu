import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSoilDepthMapHandler, getSoilDepthMapInputSchema, getSoilDepthMapTool } from '../get-soil-depth-map';

vi.mock('@/clients/sgu-client', () => ({
  sguClient: {
    getSoilDepthMapUrl: vi.fn().mockReturnValue({
      map_url: 'https://maps.sgu.se/mock-depth-map-url',
      legend_url: 'https://maps.sgu.se/mock-depth-legend-url',
      bbox: { minX: 670000, minY: 6570000, maxX: 680000, maxY: 6590000 },
      coordinate_system: 'EPSG:3006',
      layers: ['SE.GOV.SGU.JORD.JORDDJUP.50K'],
    }),
  },
}));

describe('get-soil-depth-map tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('tool definition', () => {
    it('should have correct name', () => {
      expect(getSoilDepthMapTool.name).toBe('sgu_get_soil_depth_map');
    });

    it('should have description mentioning soil depth', () => {
      expect(getSoilDepthMapTool.description).toContain('soil depth');
      expect(getSoilDepthMapTool.description).toContain('SWEREF99TM');
    });

    it('should have required input schema fields', () => {
      expect(getSoilDepthMapInputSchema.minX).toBeDefined();
      expect(getSoilDepthMapInputSchema.coordinates).toBeDefined();
    });
  });

  describe('handler', () => {
    it('should return map URLs for valid bbox', async () => {
      const response = await getSoilDepthMapHandler({
        minX: 670000,
        minY: 6570000,
        maxX: 680000,
        maxY: 6590000,
      });

      expect(response.isError).toBeUndefined();
      const data = JSON.parse(response.content[0].text);
      expect(data.map_url).toBeDefined();
      expect(data.legend_url).toBeDefined();
      expect(data.layers).toContain('SE.GOV.SGU.JORD.JORDDJUP.50K');
    });

    it('should accept corridor input', async () => {
      const response = await getSoilDepthMapHandler({
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

      const response = await getSoilDepthMapHandler({});

      expect(response.isError).toBe(true);
    });

    it('should pass custom dimensions to client', async () => {
      const response = await getSoilDepthMapHandler({
        minX: 670000,
        minY: 6570000,
        maxX: 680000,
        maxY: 6590000,
        width: 1024,
        height: 768,
        format: 'jpeg',
      });

      expect(response.isError).toBeUndefined();
    });
  });
});
