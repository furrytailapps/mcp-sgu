import { createHttpClient } from './http-client';
import { UpstreamApiError } from './errors';
import { BoundingBox, bboxToString, CRS_SWEREF99TM } from './geometry-utils';

/**
 * OGC API Features response structure
 */
interface OgcFeaturesResponse<T> {
  type: 'FeatureCollection';
  features: T[];
  numberMatched?: number;
  numberReturned?: number;
  links?: Array<{ rel: string; href: string }>;
}

interface OgcClientConfig {
  baseUrl: string;
  timeout?: number;
}

interface QueryOptions {
  bbox?: BoundingBox;
  /** WKT polygon for spatial filtering (alternative to bbox) */
  polygonWkt?: string;
  limit?: number;
  offset?: number;
  crs?: string;
}

/**
 * Create an OGC API Features client
 */
export function createOgcClient(config: OgcClientConfig) {
  const client = createHttpClient({
    baseUrl: config.baseUrl,
    timeout: config.timeout ?? 30000,
    headers: {
      Accept: 'application/geo+json, application/json',
    },
  });

  /**
   * Get items from a collection with optional spatial filter
   * Supports bbox or polygon WKT filter (polygon takes precedence)
   */
  async function getItems<T>(collection: string, options: QueryOptions = {}): Promise<T[]> {
    const { bbox, polygonWkt, limit = 100, offset, crs = CRS_SWEREF99TM } = options;

    const params: Record<string, string | number | undefined> = {
      limit,
      offset,
      // SGU OGC API accepts short CRS format (EPSG:3006), not full OGC URN
      'crs': crs,
      'bbox-crs': crs,
    };

    // Polygon filter takes precedence over bbox
    if (polygonWkt) {
      // Use CQL filter for polygon intersection
      params.filter = `INTERSECTS(geom,${polygonWkt})`;
      params['filter-lang'] = 'cql-text';
      params['filter-crs'] = crs;
    } else if (bbox) {
      params.bbox = bboxToString(bbox);
    }

    try {
      const response = await client.request<OgcFeaturesResponse<T>>(`collections/${collection}/items`, { params });
      return response.features;
    } catch (error) {
      if (error instanceof UpstreamApiError) {
        throw error;
      }
      throw new UpstreamApiError(
        `Failed to fetch from OGC collection ${collection}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        0,
        config.baseUrl,
      );
    }
  }

  /**
   * Get collections available at this endpoint
   */
  async function getCollections(): Promise<{ id: string; title: string; description?: string }[]> {
    const response = await client.request<{
      collections: Array<{ id: string; title: string; description?: string }>;
    }>('collections');
    return response.collections;
  }

  /**
   * Get a single feature by ID
   */
  async function getFeature<T>(collection: string, featureId: string): Promise<T> {
    return client.request<T>(`collections/${collection}/items/${featureId}`);
  }

  return {
    getItems,
    getCollections,
    getFeature,
  };
}
