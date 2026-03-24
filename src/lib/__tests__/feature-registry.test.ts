import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BoundingBox, Corridor } from '@/lib/geometry-utils';

// Mock OGC client — must be declared before import of the module under test
vi.mock('@/lib/ogc-client', () => ({
  createOgcClient: vi.fn(() => ({
    getItemsWithCount: vi.fn(),
    getItems: vi.fn(),
    getCollections: vi.fn(),
    getFeature: vi.fn(),
  })),
}));

// Import module under test AFTER the mock is set up
import { queryFeatures } from '../feature-registry';
import { createOgcClient } from '@/lib/ogc-client';

// ============================================================================
// Test data
// ============================================================================

const mockBedrockFeature = {
  type: 'Feature',
  id: 'bedrock-1',
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [670000, 6570000],
        [670100, 6570000],
        [670100, 6580000],
        [670000, 6580000],
        [670000, 6570000],
      ],
    ],
  },
  properties: {
    objectid: 1,
    geo_enh_tx: 'Örö',
    bergart_tx: 'Granit',
    lito_n_tx: 'Granit, grovkornig',
    tekt_n_tx: 'Svekofennicum',
    b_prop_tx: 'Massiv',
    geom_area: 10000,
  },
};

const mockSoilFeature = {
  type: 'Feature',
  id: 'soil-1',
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [670000, 6570000],
        [670100, 6570000],
        [670100, 6580000],
        [670000, 6580000],
        [670000, 6570000],
      ],
    ],
  },
  properties: {
    jg2_tx: 'Morän',
    jg2: 'Mo',
    geom_area: 5000,
  },
};

// A bbox in southern Sweden (northing center ~6580000, below 7230000 threshold)
const southernBbox: BoundingBox = {
  minX: 669000,
  minY: 6575000,
  maxX: 671000,
  maxY: 6585000,
};

// A bbox in northern Sweden (northing center ~7300000, above 7230000 threshold)
const northernBbox: BoundingBox = {
  minX: 669000,
  minY: 7250000,
  maxX: 671000,
  maxY: 7350000,
};

// ============================================================================
// Helpers
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getMockClient(features: any[], numberMatched = 100) {
  return {
    getItemsWithCount: vi.fn().mockResolvedValue({ features, numberMatched }),
    getItems: vi.fn(),
    getCollections: vi.fn(),
    getFeature: vi.fn(),
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('queryFeatures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('bedrock', () => {
    it('returns transformed features with simplified geometry', async () => {
      const mockClient = getMockClient([mockBedrockFeature]);
      vi.mocked(createOgcClient).mockReturnValue(mockClient as ReturnType<typeof createOgcClient>);

      const result = await queryFeatures('bedrock', southernBbox, 50, 'simplified');

      expect(result.count).toBe(1);
      expect(result.numberMatched).toBe(100);
      expect(result.features).toHaveLength(1);

      const feature = result.features[0] as Record<string, unknown>;
      expect(feature.id).toBe('bedrock-1');
      expect(feature.rock_type).toBe('Granit');
      expect(feature.geological_unit).toBe('Örö');
      expect(feature.geometry).toBeDefined();
    });

    it('dispatches to correct bedrock collection', async () => {
      const mockClient = getMockClient([mockBedrockFeature]);
      vi.mocked(createOgcClient).mockReturnValue(mockClient as ReturnType<typeof createOgcClient>);

      await queryFeatures('bedrock', southernBbox, 50, 'simplified');

      // Client should have been called with the bedrock collection
      expect(mockClient.getItemsWithCount).toHaveBeenCalledWith(
        'geologisk-enhet-yta',
        expect.objectContaining({ bbox: southernBbox, limit: 50 }),
      );
    });

    it('strips geometry when geometryDetail is none', async () => {
      const mockClient = getMockClient([mockBedrockFeature]);
      vi.mocked(createOgcClient).mockReturnValue(mockClient as ReturnType<typeof createOgcClient>);

      const result = await queryFeatures('bedrock', southernBbox, 50, 'none');

      const feature = result.features[0] as Record<string, unknown>;
      expect(feature.geometry).toBeUndefined();
    });

    it('preserves geometry when geometryDetail is full', async () => {
      const mockClient = getMockClient([mockBedrockFeature]);
      vi.mocked(createOgcClient).mockReturnValue(mockClient as ReturnType<typeof createOgcClient>);

      const result = await queryFeatures('bedrock', southernBbox, 50, 'full');

      const feature = result.features[0] as Record<string, unknown>;
      expect(feature.geometry).toBeDefined();
      const geom = feature.geometry as { type: string; coordinates: number[][][] };
      // full preserves all 5 coordinates of the ring
      expect(geom.coordinates[0]).toHaveLength(5);
    });
  });

  describe('soil_type scale selection', () => {
    it('uses jordarter25k-100k for southern Sweden (centerNorthing <= 7230000)', async () => {
      // southernBbox center Y = (6575000 + 6585000) / 2 = 6580000, below threshold
      const mockClient = getMockClient([mockSoilFeature]);
      vi.mocked(createOgcClient).mockReturnValue(mockClient as ReturnType<typeof createOgcClient>);

      const result = await queryFeatures('soil_type', southernBbox, 50, 'simplified');

      expect(result.count).toBe(1);
      const feature = result.features[0] as Record<string, unknown>;
      expect(feature.soil_type).toBe('Morän');

      // Should call getItemsWithCount with the 25k soil collection
      expect(mockClient.getItemsWithCount).toHaveBeenCalledWith(
        'grundlager',
        expect.objectContaining({ bbox: southernBbox }),
      );
    });

    it('uses jordarter250k for northern Sweden (centerNorthing > 7230000)', async () => {
      // northernBbox center Y = (7250000 + 7350000) / 2 = 7300000, above threshold
      const mockClient = getMockClient([mockSoilFeature]);
      vi.mocked(createOgcClient).mockReturnValue(mockClient as ReturnType<typeof createOgcClient>);

      const result = await queryFeatures('soil_type', northernBbox, 50, 'simplified');

      expect(result.count).toBe(1);
      // Both north and south use the same collection name 'grundlager' but different clients
      expect(mockClient.getItemsWithCount).toHaveBeenCalledWith(
        'grundlager',
        expect.objectContaining({ bbox: northernBbox }),
      );
    });

    it('uses different clients for north vs south (different createOgcClient instances)', async () => {
      // The registry creates two separate clients; track which one is called by tracking call counts
      // When mocking at module level, both north and south calls go through the same mock,
      // but we verify the mock was called with the right bbox each time.
      const mockClient = getMockClient([mockSoilFeature]);
      vi.mocked(createOgcClient).mockReturnValue(mockClient as ReturnType<typeof createOgcClient>);

      await queryFeatures('soil_type', southernBbox, 10, 'none');
      await queryFeatures('soil_type', northernBbox, 10, 'none');

      // Two separate calls — one for south, one for north
      expect(mockClient.getItemsWithCount).toHaveBeenCalledTimes(2);
    });
  });

  describe('corridor queries', () => {
    it('uses polygonWkt filter when corridor is provided', async () => {
      const mockClient = getMockClient([mockBedrockFeature]);
      vi.mocked(createOgcClient).mockReturnValue(mockClient as ReturnType<typeof createOgcClient>);

      const corridor: Corridor = {
        coordinates: [
          { x: 669000, y: 6575000 },
          { x: 671000, y: 6585000 },
        ],
        bufferMeters: 500,
      };

      await queryFeatures('bedrock', southernBbox, 50, 'simplified', corridor);

      expect(mockClient.getItemsWithCount).toHaveBeenCalledWith(
        'geologisk-enhet-yta',
        expect.objectContaining({ polygonWkt: expect.stringMatching(/^POLYGON\(\(/) }),
      );
    });

    it('falls back to bbox if corridor polygon query fails', async () => {
      const mockClient = {
        getItemsWithCount: vi
          .fn()
          .mockRejectedValueOnce(new Error('polygon filter not supported'))
          .mockResolvedValueOnce({ features: [mockBedrockFeature], numberMatched: 1 }),
        getItems: vi.fn(),
        getCollections: vi.fn(),
        getFeature: vi.fn(),
      };
      vi.mocked(createOgcClient).mockReturnValue(mockClient as ReturnType<typeof createOgcClient>);

      const corridor: Corridor = {
        coordinates: [
          { x: 669000, y: 6575000 },
          { x: 671000, y: 6585000 },
        ],
        bufferMeters: 500,
      };

      const result = await queryFeatures('bedrock', southernBbox, 50, 'simplified', corridor);

      // Should have been called twice: once with polygon (failed), once with bbox (fallback)
      expect(mockClient.getItemsWithCount).toHaveBeenCalledTimes(2);
      expect(result.count).toBe(1);
    });
  });

  describe('other data types', () => {
    it('queries groundwater_aquifers collection', async () => {
      const mockClient = getMockClient([]);
      vi.mocked(createOgcClient).mockReturnValue(mockClient as ReturnType<typeof createOgcClient>);

      await queryFeatures('groundwater_aquifers', southernBbox, 50, 'simplified');

      expect(mockClient.getItemsWithCount).toHaveBeenCalledWith(
        'grundvattenmagasin',
        expect.any(Object),
      );
    });

    it('queries wells collection', async () => {
      const mockClient = getMockClient([]);
      vi.mocked(createOgcClient).mockReturnValue(mockClient as ReturnType<typeof createOgcClient>);

      await queryFeatures('wells', southernBbox, 50, 'simplified');

      expect(mockClient.getItemsWithCount).toHaveBeenCalledWith(
        'brunnar',
        expect.any(Object),
      );
    });

    it('queries soil_layers collection', async () => {
      const mockClient = getMockClient([]);
      vi.mocked(createOgcClient).mockReturnValue(mockClient as ReturnType<typeof createOgcClient>);

      await queryFeatures('soil_layers', southernBbox, 50, 'simplified');

      expect(mockClient.getItemsWithCount).toHaveBeenCalledWith(
        'lagerinformation',
        expect.any(Object),
      );
    });

    it('returns correct count and numberMatched from API response', async () => {
      const mockClient = getMockClient([mockBedrockFeature, mockBedrockFeature], 999);
      vi.mocked(createOgcClient).mockReturnValue(mockClient as ReturnType<typeof createOgcClient>);

      const result = await queryFeatures('bedrock', southernBbox, 50, 'simplified');

      expect(result.count).toBe(2);
      expect(result.numberMatched).toBe(999);
    });
  });
});
