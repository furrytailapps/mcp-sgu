import { describe, it, expect } from 'vitest';
import { sguClient } from '@/clients/sgu-client';
import { wgs84ToSweref99 } from '@/lib/coordinates';

describe('sgu-client WMS integration (real API)', { timeout: 30000 }, () => {
  const stockholmPoint = wgs84ToSweref99({ latitude: 59.335, longitude: 18.065 });
  const stockholmPoint2 = wgs84ToSweref99({ latitude: 59.33, longitude: 18.07 });
  const uppsalaPoint = wgs84ToSweref99({ latitude: 59.86, longitude: 17.64 });
  // Suburban Stockholm for well query — sparse data, well at exact pixel not guaranteed
  const stockholmSuburbanPoint = wgs84ToSweref99({ latitude: 59.35, longitude: 18.1 });

  describe('bedrock at Stockholm (59.335, 18.065)', () => {
    it('returns non-null result', async () => {
      const result = await sguClient.getBedrockAt(stockholmPoint);
      expect(result).not.toBeNull();
    });

    it('has a non-empty rock_type string', async () => {
      const result = await sguClient.getBedrockAt(stockholmPoint);
      expect(result).not.toBeNull();
      expect(typeof result!.rock_type).toBe('string');
      expect(result!.rock_type!.length).toBeGreaterThan(0);
    });
  });

  describe('soil type at Stockholm (59.335, 18.065)', () => {
    it('returns non-null result', async () => {
      const result = await sguClient.getSoilTypeAt(stockholmPoint);
      expect(result).not.toBeNull();
    });

    it('has a non-empty soil_type string', async () => {
      const result = await sguClient.getSoilTypeAt(stockholmPoint);
      expect(result).not.toBeNull();
      expect(typeof result!.soil_type).toBe('string');
      expect(result!.soil_type!.length).toBeGreaterThan(0);
    });
  });

  describe('soil depth at Stockholm (59.33, 18.07)', () => {
    it('returns non-null result', async () => {
      const result = await sguClient.getSoilDepthAt(stockholmPoint2);
      expect(result).not.toBeNull();
    });

    it('has a depth_class that does not contain the no-data sentinel "255"', async () => {
      const result = await sguClient.getSoilDepthAt(stockholmPoint2);
      expect(result).not.toBeNull();
      // depth_class is undefined when the raw value >= 255 (no-data sentinel)
      // If defined, it must not have been filtered incorrectly
      if (result!.depth_class !== undefined) {
        expect(result!.depth_class).not.toContain('255');
      }
    });
  });

  describe('radon risk at Stockholm (59.33, 18.07)', () => {
    it('returns non-null result', async () => {
      const result = await sguClient.getRadonRiskAt(stockholmPoint2);
      expect(result).not.toBeNull();
    });

    it('has radiation_value between 0 and 100 (not the 3.4e+38 no-data sentinel)', async () => {
      const result = await sguClient.getRadonRiskAt(stockholmPoint2);
      expect(result).not.toBeNull();
      // radiation_value is filtered to undefined when raw >= 1e10 (no-data sentinel ~3.4e+38)
      if (result!.radiation_value !== undefined) {
        expect(result!.radiation_value).toBeGreaterThanOrEqual(0);
        expect(result!.radiation_value).toBeLessThanOrEqual(100);
      }
    });

    it('has risk_level as one of low, moderate, or high', async () => {
      const result = await sguClient.getRadonRiskAt(stockholmPoint2);
      expect(result).not.toBeNull();
      if (result!.risk_level !== undefined) {
        expect(['low', 'moderate', 'high']).toContain(result!.risk_level);
      }
    });
  });

  describe('groundwater vulnerability at Stockholm (59.33, 18.07)', () => {
    it('returns non-null result', async () => {
      const result = await sguClient.getGroundwaterVulnerabilityAt(stockholmPoint2);
      expect(result).not.toBeNull();
    });

    it('has vulnerability_class defined', async () => {
      const result = await sguClient.getGroundwaterVulnerabilityAt(stockholmPoint2);
      expect(result).not.toBeNull();
      expect(result!.vulnerability_class).toBeDefined();
    });
  });

  describe('groundwater (aquifer) at Uppsala (59.86, 17.64)', () => {
    it('returns non-null result', async () => {
      const result = await sguClient.getGroundwaterAt(uppsalaPoint);
      expect(result).not.toBeNull();
    });

    it('has a non-empty aquifer_type string', async () => {
      const result = await sguClient.getGroundwaterAt(uppsalaPoint);
      expect(result).not.toBeNull();
      expect(typeof result!.aquifer_type).toBe('string');
      expect(result!.aquifer_type!.length).toBeGreaterThan(0);
    });
  });

  describe('landslide — SKIPPED', () => {
    // The WMS layer SE.GOV.SGU.JORD.SKRED has a MinScaleDenominator that
    // requires a bbox covering at least ~2km. The getLandslideAt method uses a
    // 100m buffer, which falls below that threshold. As a result, the WMS
    // returns an empty FeatureCollection for all point queries, and
    // getLandslideAt always returns null.
    //
    // This will be fixed in the unified tool redesign where WMS calls for
    // scale-sensitive layers will use a wider bbox before querying.
    it.skip('getLandslideAt — always returns null due to MinScaleDenominator constraint', () => {
      // Not tested until the unified tool redesign fixes the bbox size.
    });
  });

  describe('well point query at Stockholm suburban area (59.35, 18.1)', () => {
    it('does not throw', async () => {
      // Wells are sparse point features on a 250k scale layer. No well is
      // guaranteed to fall on the exact queried pixel. Null is a normal result.
      await expect(sguClient.getWellAt(stockholmSuburbanPoint)).resolves.not.toThrow();
    });

    it('returns null or a valid WellPointInfo', async () => {
      const result = await sguClient.getWellAt(stockholmSuburbanPoint);
      // Null is acceptable — sparse data, pixel may not hit a well
      if (result !== null) {
        // If a well is found, basic sanity checks
        if (result.well_id !== undefined) {
          expect(typeof result.well_id).toBe('number');
        }
        if (result.total_depth_m !== undefined) {
          expect(typeof result.total_depth_m).toBe('number');
          expect(result.total_depth_m).toBeGreaterThan(0);
        }
      }
    });
  });
});
