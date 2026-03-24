import { createOgcClient } from '@/lib/ogc-client';
import { simplifyGeometry, type BoundingBox, type Corridor, corridorToWktPolygon } from '@/lib/geometry-utils';
import type { GeoJsonFeature, GeoJsonGeometry } from '@/types/geojson';
import type { FeatureDataType, GeometryDetail } from '@/types/common-schemas';
import {
  transformBedrockFeature,
  transformSoilFeature,
  transformAquiferFeature,
  transformWellFeature,
  transformSoilLayerFeature,
} from '@/types/features';

// ============================================================================
// OGC client factory (lazy — called at query time so mocks apply correctly)
// ============================================================================

function getBedrockClient() {
  return createOgcClient({
    baseUrl: 'https://api.sgu.se/oppnadata/berggrund50k-250k/ogc/features/v1',
  });
}

function getSoilType25kClient() {
  return createOgcClient({
    baseUrl: 'https://api.sgu.se/oppnadata/jordarter25k-100k/ogc/features/v1',
  });
}

function getSoilType250kClient() {
  return createOgcClient({
    baseUrl: 'https://api.sgu.se/oppnadata/jordarter250k/ogc/features/v1',
  });
}

function getGroundwaterClient() {
  return createOgcClient({
    baseUrl: 'https://api.sgu.se/oppnadata/grundvattenmagasin/ogc/features/v1',
  });
}

function getWellsClient() {
  return createOgcClient({
    baseUrl: 'https://api.sgu.se/oppnadata/brunnar/ogc/features/v1',
  });
}

function getSoilLayersClient() {
  return createOgcClient({
    baseUrl: 'https://api.sgu.se/oppnadata/jordlagerfoljder/ogc/features/v1',
  });
}

// ============================================================================
// Registry types
// ============================================================================

interface StaticFeatureConfig {
  getClient: () => ReturnType<typeof createOgcClient>;
  collection: string;
  transform: (feature: GeoJsonFeature) => Record<string, unknown>;
}

interface DynamicFeatureConfig {
  query: (
    bbox: BoundingBox,
    limit: number,
    corridor?: Corridor,
  ) => Promise<{ features: GeoJsonFeature[]; numberMatched?: number }>;
  transform: (feature: GeoJsonFeature) => Record<string, unknown>;
}

type FeatureTypeConfig = StaticFeatureConfig | DynamicFeatureConfig;

// ============================================================================
// Shared query helper
// ============================================================================

async function queryOgcEndpoint(
  client: ReturnType<typeof createOgcClient>,
  collection: string,
  bbox: BoundingBox,
  limit: number,
  corridor?: Corridor,
): Promise<{ features: GeoJsonFeature[]; numberMatched?: number }> {
  if (corridor) {
    try {
      const polygonWkt = corridorToWktPolygon(corridor);
      return await client.getItemsWithCount<GeoJsonFeature>(collection, { polygonWkt, limit });
    } catch {
      // Fall back to bbox query
    }
  }
  return await client.getItemsWithCount<GeoJsonFeature>(collection, { bbox, limit });
}

// ============================================================================
// Feature registry
// ============================================================================

// SWEREF99TM northing threshold separating northern from southern Sweden for soil type scale.
// Below: use 25k-100k scale; above: use 250k scale (only 250k covers the far north).
const NORTH_SOUTHING_THRESHOLD = 7230000;

const FEATURE_REGISTRY: Record<FeatureDataType, FeatureTypeConfig> = {
  bedrock: {
    getClient: getBedrockClient,
    collection: 'geologisk-enhet-yta',
    transform: transformBedrockFeature as unknown as (feature: GeoJsonFeature) => Record<string, unknown>,
  },

  soil_type: {
    query: async (bbox: BoundingBox, limit: number, corridor?: Corridor) => {
      const centerNorthing = (bbox.minY + bbox.maxY) / 2;
      const client =
        centerNorthing > NORTH_SOUTHING_THRESHOLD ? getSoilType250kClient() : getSoilType25kClient();
      return queryOgcEndpoint(client, 'grundlager', bbox, limit, corridor);
    },
    transform: transformSoilFeature as unknown as (feature: GeoJsonFeature) => Record<string, unknown>,
  },

  groundwater_aquifers: {
    getClient: getGroundwaterClient,
    collection: 'grundvattenmagasin',
    transform: transformAquiferFeature as unknown as (feature: GeoJsonFeature) => Record<string, unknown>,
  },

  wells: {
    getClient: getWellsClient,
    collection: 'brunnar',
    transform: transformWellFeature as unknown as (feature: GeoJsonFeature) => Record<string, unknown>,
  },

  soil_layers: {
    getClient: getSoilLayersClient,
    collection: 'lagerinformation',
    transform: transformSoilLayerFeature as unknown as (feature: GeoJsonFeature) => Record<string, unknown>,
  },
};

// ============================================================================
// Main export
// ============================================================================

export async function queryFeatures(
  dataType: FeatureDataType,
  bbox: BoundingBox,
  limit: number,
  geometryDetail: GeometryDetail,
  corridor?: Corridor,
): Promise<{ features: Record<string, unknown>[]; count: number; numberMatched?: number }> {
  const config = FEATURE_REGISTRY[dataType];

  // Get raw features from OGC API
  let result: { features: GeoJsonFeature[]; numberMatched?: number };
  if ('query' in config) {
    result = await config.query(bbox, limit, corridor);
  } else {
    const client = config.getClient();
    result = await queryOgcEndpoint(client, config.collection, bbox, limit, corridor);
  }

  // Transform properties + simplify/strip geometry
  const features = result.features.map((feature) => {
    const transformed = config.transform(feature);
    if (transformed.geometry && geometryDetail) {
      transformed.geometry = simplifyGeometry(transformed.geometry as GeoJsonGeometry, geometryDetail);
    }
    return transformed;
  });

  return { features, count: features.length, numberMatched: result.numberMatched };
}
