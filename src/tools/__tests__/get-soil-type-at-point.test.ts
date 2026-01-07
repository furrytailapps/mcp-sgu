import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSoilTypeAtPointHandler, getSoilTypeAtPointInputSchema, getSoilTypeAtPointTool } from '../get-soil-type-at-point';

vi.mock('@/clients/sgu-client', () => ({
  sguClient: {
    getSoilTypeAt: vi.fn().mockResolvedValue({
      surface_type: 'Morän',
      surface_type_code: 'Till',
      underlying_layers: [],
      landform: 'Moränmark',
      boulder_coverage: 'Medium',
    }),
  },
}));

describe('get-soil-type-at-point tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('tool definition', () => {
    it('should have correct name', () => {
      expect(getSoilTypeAtPointTool.name).toBe('sgu_get_soil_type_at_point');
    });

    it('should have description mentioning soil type and point', () => {
      expect(getSoilTypeAtPointTool.description).toContain('soil type');
      expect(getSoilTypeAtPointTool.description).toContain('coordinate');
    });

    it('should have x and y in input schema', () => {
      expect(getSoilTypeAtPointInputSchema.x).toBeDefined();
      expect(getSoilTypeAtPointInputSchema.y).toBeDefined();
    });
  });

  describe('handler', () => {
    it('should return soil type info for valid coordinates', async () => {
      const response = await getSoilTypeAtPointHandler({
        x: 674000,
        y: 6580000,
      });

      expect(response.isError).toBeUndefined();
      const data = JSON.parse(response.content[0].text);
      expect(data.coordinate_system).toBe('EPSG:3006');
      expect(data.coordinates.x).toBe(674000);
      expect(data.coordinates.y).toBe(6580000);
      expect(data.found).toBe(true);
    });

    it('should reject coordinates outside Sweden', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await getSoilTypeAtPointHandler({
        x: 100000, // Outside Sweden
        y: 6580000,
      });

      expect(response.isError).toBe(true);
      const error = JSON.parse(response.content[0].text);
      expect(error.code).toBe('VALIDATION_ERROR');
    });
  });
});
