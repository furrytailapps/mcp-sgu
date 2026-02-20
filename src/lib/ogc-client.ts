import { createHttpClient } from './http-client';
import { UpstreamApiError } from './errors';
import { BoundingBox, bboxToString, CRS_SWEREF99TM } from './geometry-utils';

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

export function createOgcClient(config: OgcClientConfig) {
  const client = createHttpClient({
    baseUrl: config.baseUrl,
    timeout: config.timeout ?? 30000,
    headers: {
      Accept: 'application/geo+json, application/json',
    },
  });

  // Supports bbox or polygon WKT filter (polygon takes precedence)
  async function getItems<T>(collection: string, options: QueryOptions = {}): Promise<T[]> {
    const { bbox, polygonWkt, limit = 100, offset, crs = CRS_SWEREF99TM } = options;

    const params: Record<string, string | number | undefined> = {
      limit,
      offset,
      // SGU OGC API accepts short CRS format (EPSG:3006), not full OGC URN
      'crs': crs,
      'bbox-crs': crs,
    };

    if (polygonWkt) {
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
        'Failed to fetch bedrock features for this area. The data service may be temporarily unavailable — try again.',
        0,
        config.baseUrl,
      );
    }
  }

  async function getCollections(): Promise<{ id: string; title: string; description?: string }[]> {
    const response = await client.request<{
      collections: Array<{ id: string; title: string; description?: string }>;
    }>('collections');
    return response.collections;
  }

  async function getFeature<T>(collection: string, featureId: string): Promise<T> {
    return client.request<T>(`collections/${collection}/items/${featureId}`);
  }

  return {
    getItems,
    getCollections,
    getFeature,
  };
}
