import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getBoulderCoverageMapHandler,
  getBoulderCoverageMapInputSchema,
  getBoulderCoverageMapTool,
} from '../get-boulder-coverage-map';

vi.mock('@/clients/sgu-client', () => ({
  sguClient: {
    getBoulderCoverageMapUrl: vi.fn().mockReturnValue({
      map_url: 'https://maps.sgu.se/mock-boulder-map-url',
      legend_url: 'https://maps.sgu.se/mock-boulder-legend-url',
      bbox: { minX: 670000, minY: 6570000, maxX: 680000, maxY: 6590000 },
      coordinate_system: 'EPSG:3006',
      layers: ['SE.GOV.SGU.JORD.BLOCKIGHET.25K'],
    }),
  },
}));

describe('get-boulder-coverage-map tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('tool definition', () => {
    it('should have correct name', () => {
      expect(getBoulderCoverageMapTool.name).toBe('sgu_get_boulder_coverage_map');
    });

    it('should have description mentioning boulder coverage', () => {
      expect(getBoulderCoverageMapTool.description).toContain('boulder');
      expect(getBoulderCoverageMapTool.description).toContain('SWEREF99TM');
    });

    it('should have required input schema fields', () => {
      expect(getBoulderCoverageMapInputSchema.bbox).toBeDefined();
      expect(getBoulderCoverageMapInputSchema.corridor).toBeDefined();
    });
  });

  describe('handler', () => {
    it('should return map URLs for valid bbox', async () => {
      const response = await getBoulderCoverageMapHandler({
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
      expect(data.layers).toContain('SE.GOV.SGU.JORD.BLOCKIGHET.25K');
    });

    it('should accept corridor input', async () => {
      const response = await getBoulderCoverageMapHandler({
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

    it('should require either bbox or corridor', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await getBoulderCoverageMapHandler({});

      expect(response.isError).toBe(true);
    });
  });
});
