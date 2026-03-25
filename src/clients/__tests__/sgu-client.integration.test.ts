import { describe, it, expect } from 'vitest';
import { sguClient } from '@/clients/sgu-client';
import { wgs84ToSweref99 } from '@/lib/coordinates';

describe('sgu-client WMS integration (real API)', { timeout: 30000 }, () => {
  const stockholmPoint2 = wgs84ToSweref99({ latitude: 59.33, longitude: 18.07 });

  describe('soil depth at Stockholm (59.33, 18.07)', () => {
    it('returns non-null result', async () => {
      const result = await sguClient.getSoilDepthAt(stockholmPoint2);
      expect(result).not.toBeNull();
    });

    it('has a depth_class that does not contain the no-data sentinel "255"', async () => {
      const result = await sguClient.getSoilDepthAt(stockholmPoint2);
      expect(result).not.toBeNull();
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

  describe('landslide at Trollhättan (57.98, 12.08) — 2km buffer', () => {
    const landslidePoint = wgs84ToSweref99({ latitude: 57.98, longitude: 12.08 });

    it('returns non-null result at known landslide zone', async () => {
      const result = await sguClient.getLandslideAt(landslidePoint);
      expect(result).not.toBeNull();
    });

    it('has description defined', async () => {
      const result = await sguClient.getLandslideAt(landslidePoint);
      if (result) {
        expect(result.description).toBeDefined();
      }
    });
  });
});
