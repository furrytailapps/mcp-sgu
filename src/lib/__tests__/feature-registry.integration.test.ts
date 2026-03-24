import { describe, it, expect } from 'vitest';
import { queryFeatures } from '../feature-registry';
import type { BoundingBox } from '../geometry-utils';

// Stockholm area in WGS84: minX=minLon, minY=minLat
const stockholmBbox: BoundingBox = {
  minX: 18.0, // minLon
  minY: 59.3, // minLat
  maxX: 18.1, // maxLon
  maxY: 59.35, // maxLat
};

// Wider bbox for data types that may need broader coverage
const stockholmWideBbox: BoundingBox = {
  minX: 17.8,
  minY: 59.2,
  maxX: 18.3,
  maxY: 59.5,
};

describe('feature-registry integration (real API)', { timeout: 30000 }, () => {
  describe('bedrock returns real features', () => {
    it('returns features with rock_type and geological_unit', async () => {
      const result = await queryFeatures('bedrock', stockholmBbox, 5, 'simplified');

      expect(result.count).toBeGreaterThan(0);
      expect(result.features.length).toBeGreaterThan(0);
      expect(result.features.length).toBeLessThanOrEqual(5);

      const first = result.features[0];
      expect(typeof first.rock_type).toBe('string');
      expect((first.rock_type as string).length).toBeGreaterThan(0);
      expect(typeof first.geological_unit).toBe('string');
      expect((first.geological_unit as string).length).toBeGreaterThan(0);
    });

    it('returns geometry with bedrock features', async () => {
      const result = await queryFeatures('bedrock', stockholmBbox, 5, 'simplified');

      const first = result.features[0];
      expect(first.geometry).toBeDefined();
      const geom = first.geometry as { type: string; coordinates: unknown };
      expect(['Polygon', 'MultiPolygon']).toContain(geom.type);
    });
  });

  describe('soil_type returns real features', () => {
    it('returns features with soil_type', async () => {
      const result = await queryFeatures('soil_type', stockholmBbox, 5, 'simplified');

      expect(result.count).toBeGreaterThan(0);
      expect(result.features.length).toBeGreaterThan(0);

      const first = result.features[0];
      expect(typeof first.soil_type).toBe('string');
      expect((first.soil_type as string).length).toBeGreaterThan(0);
    });
  });

  describe('groundwater_aquifers returns real features', () => {
    it('returns features for the Stockholm area', async () => {
      // Stockholm has 12 aquifers in the narrow bbox; use it directly
      const result = await queryFeatures('groundwater_aquifers', stockholmBbox, 5, 'simplified');

      expect(result.count).toBeGreaterThan(0);
      expect(result.features.length).toBeGreaterThan(0);

      const first = result.features[0];
      expect(typeof first.aquifer_type).toBe('string');
      expect((first.aquifer_type as string).length).toBeGreaterThan(0);
    });
  });

  describe('wells returns real features', () => {
    it('returns features with well_id and total_depth_m', async () => {
      const result = await queryFeatures('wells', stockholmBbox, 10, 'simplified');

      expect(result.count).toBeGreaterThan(0);
      expect(result.features.length).toBeGreaterThan(0);
      expect(result.features.length).toBeLessThanOrEqual(10);

      const first = result.features[0];
      expect(typeof first.well_id).toBe('number');
      // total_depth_m is optional in the API — check when present
      if (first.total_depth_m !== undefined) {
        expect(typeof first.total_depth_m).toBe('number');
      }
    });
  });

  describe('soil_layers returns real features', () => {
    it('returns features with layer_number and depth_from_m', async () => {
      const result = await queryFeatures('soil_layers', stockholmBbox, 5, 'simplified');

      expect(result.count).toBeGreaterThan(0);
      expect(result.features.length).toBeGreaterThan(0);

      const first = result.features[0];
      expect(typeof first.layer_number).toBe('number');
      // depth_from_m is optional in the schema; real data has it
      if (first.depth_from_m !== undefined) {
        expect(typeof first.depth_from_m).toBe('number');
      }
    });
  });

  describe('geometry detail levels', () => {
    it("detail 'none' returns features with no geometry", async () => {
      const result = await queryFeatures('bedrock', stockholmBbox, 3, 'none');

      expect(result.count).toBeGreaterThan(0);
      for (const feature of result.features) {
        expect(feature.geometry).toBeUndefined();
      }
    });

    it("detail 'simplified' returns features with geometry", async () => {
      const result = await queryFeatures('bedrock', stockholmBbox, 3, 'simplified');

      expect(result.count).toBeGreaterThan(0);
      for (const feature of result.features) {
        expect(feature.geometry).toBeDefined();
      }
    });

    it("detail 'full' returns features with geometry", async () => {
      const result = await queryFeatures('bedrock', stockholmBbox, 3, 'full');

      expect(result.count).toBeGreaterThan(0);
      for (const feature of result.features) {
        expect(feature.geometry).toBeDefined();
      }
    });

    it("'full' has at least as many coordinates as 'simplified'", async () => {
      const simplified = await queryFeatures('bedrock', stockholmBbox, 1, 'simplified');
      const full = await queryFeatures('bedrock', stockholmBbox, 1, 'full');

      expect(simplified.count).toBeGreaterThan(0);
      expect(full.count).toBeGreaterThan(0);

      // Count total coordinates in the first feature's geometry
      function countCoords(geom: unknown): number {
        if (!geom) return 0;
        const g = geom as { type: string; coordinates: unknown };
        if (g.type === 'Point') return 1;
        if (g.type === 'LineString') return (g.coordinates as number[][]).length;
        if (g.type === 'Polygon')
          return (g.coordinates as number[][][]).reduce((sum, ring) => sum + ring.length, 0);
        if (g.type === 'MultiPolygon')
          return (g.coordinates as number[][][][]).reduce(
            (sum, poly) => sum + poly.reduce((s, ring) => s + ring.length, 0),
            0,
          );
        return 0;
      }

      const simplifiedCoords = countCoords(simplified.features[0].geometry);
      const fullCoords = countCoords(full.features[0].geometry);
      expect(fullCoords).toBeGreaterThanOrEqual(simplifiedCoords);
    });
  });

  describe('WGS84 coordinates in response', () => {
    it('bedrock geometry coordinates are in WGS84 range', async () => {
      const result = await queryFeatures('bedrock', stockholmBbox, 3, 'simplified');

      expect(result.count).toBeGreaterThan(0);
      for (const feature of result.features) {
        const geom = feature.geometry as { type: string; coordinates: unknown } | undefined;
        if (!geom) continue;

        // Extract all lon/lat pairs and verify they are WGS84, not SWEREF99TM
        // WGS84 Sweden: lon ~11-25, lat ~55-70
        // SWEREF99TM easting: 200000-1000000, northing: 6100000-7700000
        let rings: number[][][] = [];
        if (geom.type === 'Polygon') {
          rings = geom.coordinates as number[][][];
        } else if (geom.type === 'MultiPolygon') {
          for (const poly of geom.coordinates as number[][][][]) {
            rings.push(...poly);
          }
        }

        for (const ring of rings) {
          for (const coord of ring) {
            const lon = coord[0];
            const lat = coord[1];
            // Must be WGS84 lon/lat, not projected meters
            expect(lon).toBeGreaterThan(10);
            expect(lon).toBeLessThan(25);
            expect(lat).toBeGreaterThan(54);
            expect(lat).toBeLessThan(71);
            // Definitively NOT SWEREF99TM (would be >200000)
            expect(lon).toBeLessThan(1000);
          }
        }
      }
    });

    it('wells point geometry is in WGS84 range', async () => {
      const result = await queryFeatures('wells', stockholmBbox, 5, 'simplified');

      expect(result.count).toBeGreaterThan(0);
      for (const feature of result.features) {
        const geom = feature.geometry as { type: string; coordinates: number[] } | undefined;
        if (!geom || geom.type !== 'Point') continue;

        const lon = geom.coordinates[0];
        const lat = geom.coordinates[1];
        expect(lon).toBeGreaterThan(10);
        expect(lon).toBeLessThan(25);
        expect(lat).toBeGreaterThan(54);
        expect(lat).toBeLessThan(71);
        expect(lon).toBeLessThan(1000);
      }
    });
  });

  describe('numberMatched is returned', () => {
    it('bedrock returns numberMatched', async () => {
      const result = await queryFeatures('bedrock', stockholmBbox, 5, 'simplified');

      expect(typeof result.numberMatched).toBe('number');
      // numberMatched should be >= features returned
      expect(result.numberMatched!).toBeGreaterThanOrEqual(result.count);
    });

    it('wells returns numberMatched and it reflects total available', async () => {
      const result = await queryFeatures('wells', stockholmBbox, 2, 'none');

      expect(typeof result.numberMatched).toBe('number');
      // Stockholm has thousands of wells; matched should exceed our small limit
      expect(result.numberMatched!).toBeGreaterThan(2);
    });
  });

  describe('limit is respected', () => {
    it('returns at most 2 features when limit=2', async () => {
      const result = await queryFeatures('bedrock', stockholmBbox, 2, 'none');

      expect(result.features.length).toBeLessThanOrEqual(2);
      expect(result.count).toBeLessThanOrEqual(2);
    });

    it('returns at most 2 wells when limit=2', async () => {
      const result = await queryFeatures('wells', stockholmBbox, 2, 'none');

      expect(result.features.length).toBeLessThanOrEqual(2);
      expect(result.count).toBeLessThanOrEqual(2);
    });
  });
});
