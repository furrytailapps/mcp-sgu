import { createOgcClient } from '@/lib/ogc-client';
import { simplifyGeometry, type BoundingBox, type Corridor, corridorToWktPolygon } from '@/lib/geometry-utils';
import { CRS_SWEREF99TM } from '@/lib/coordinates';
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

const OGC_BASE = 'https://api.sgu.se/oppnadata';

function getOgcClient(workspace: string) {
  return createOgcClient({ baseUrl: `${OGC_BASE}/${workspace}/ogc/features/v1` });
}

// ============================================================================
// Registry types
// ============================================================================

interface FeatureConfig {
  getClient: (bbox: BoundingBox) => ReturnType<typeof createOgcClient>;
  collection: string;
  transform: RegistryTransform;
}

// ============================================================================
// Shared query helper
// ============================================================================

// wgs84Bbox has minX=minLon, minY=minLat (BoundingBox is CRS-agnostic)
async function queryOgcEndpoint(
  client: ReturnType<typeof createOgcClient>,
  collection: string,
  wgs84Bbox: BoundingBox,
  limit: number,
  corridor?: Corridor,
): Promise<{ features: GeoJsonFeature[]; numberMatched?: number }> {
  if (corridor) {
    try {
      const polygonWkt = corridorToWktPolygon(corridor);
      // Polygon is in SWEREF99TM; no crs param = WGS84 response
      return await client.getItemsWithCount<GeoJsonFeature>(collection, {
        polygonWkt,
        filterCrs: CRS_SWEREF99TM,
        limit,
      });
    } catch {
      // Fall back to bbox query
    }
  }
  // No crs param = WGS84 bbox + WGS84 response
  return await client.getItemsWithCount<GeoJsonFeature>(collection, { bbox: wgs84Bbox, limit });
}

// ============================================================================
// Feature registry
// ============================================================================

// WGS84 latitude threshold separating northern from southern Sweden for soil type scale.
// Below: use 25k-100k scale; above: use 250k scale (only 250k covers the far north).
// ~65.1°N corresponds to SWEREF99TM northing ~7230000.
const NORTH_LATITUDE_THRESHOLD = 65.1;

// Each transform is strongly typed (e.g. GeoJsonFeature<SguBedrockProperties> => BedrockFeature)
// but the registry needs a common type. The casts are safe because the registry pairs each
// transform with its matching OGC endpoint — bedrock endpoint always returns bedrock features, etc.
type RegistryTransform = (feature: GeoJsonFeature) => Record<string, unknown>;

const FEATURE_REGISTRY: Record<FeatureDataType, FeatureConfig> = {
  bedrock: {
    getClient: () => getOgcClient('berggrund50k-250k'),
    collection: 'geologisk-enhet-yta',
    transform: transformBedrockFeature as unknown as RegistryTransform,
  },

  soil_type: {
    getClient: (bbox) => {
      // bbox is WGS84: minY=minLat, maxY=maxLat
      const centerLat = (bbox.minY + bbox.maxY) / 2;
      return centerLat > NORTH_LATITUDE_THRESHOLD
        ? getOgcClient('jordarter250k')
        : getOgcClient('jordarter25k-100k');
    },
    collection: 'grundlager',
    transform: transformSoilFeature as unknown as RegistryTransform,
  },

  groundwater_aquifers: {
    getClient: () => getOgcClient('grundvattenmagasin'),
    collection: 'grundvattenmagasin',
    transform: transformAquiferFeature as unknown as RegistryTransform,
  },

  wells: {
    getClient: () => getOgcClient('brunnar'),
    collection: 'brunnar',
    transform: transformWellFeature as unknown as RegistryTransform,
  },

  soil_layers: {
    getClient: () => getOgcClient('jordlagerfoljder'),
    collection: 'lagerinformation',
    transform: transformSoilLayerFeature as unknown as RegistryTransform,
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
  const client = config.getClient(bbox);
  const result = await queryOgcEndpoint(client, config.collection, bbox, limit, corridor);

  // Transform properties + simplify/strip geometry
  const features = result.features.map((feature) => {
    const transformed = config.transform(feature);
    if (transformed.geometry) {
      transformed.geometry = simplifyGeometry(transformed.geometry as GeoJsonGeometry, geometryDetail);
    }
    return transformed;
  });

  return { features, count: features.length, numberMatched: result.numberMatched };
}
