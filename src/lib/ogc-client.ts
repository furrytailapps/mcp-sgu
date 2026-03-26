import { createHttpClient } from './http-client';
import { UpstreamApiError } from './errors';
import { BoundingBox, bboxToString } from './geometry-utils';
import { CRS_SWEREF99TM } from './coordinates';

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
  /** CRS of polygonWkt. Only sent when polygonWkt is set. */
  filterCrs?: string;
  limit?: number;
  offset?: number;
  /** CRS for bbox and response. undefined = API default (WGS84/CRS84) */
  crs?: string;
}

export function createOgcClient(config: OgcClientConfig) {
  const client = createHttpClient({
    baseUrl: config.baseUrl,
    timeout: config.timeout ?? 30000,
    headers: {
      Accept: 'application/geo+json, application/json',
    },
    // WORKAROUND: api.sgu.se has intermittent SSL cert issues
    skipSslVerification: config.baseUrl.includes('api.sgu.se'),
  });

  // Supports bbox or polygon WKT filter (polygon takes precedence)
  async function getItemsWithCount<T>(
    collection: string,
    options: QueryOptions = {},
  ): Promise<{ features: T[]; numberMatched?: number }> {
    const { bbox, polygonWkt, filterCrs, limit = 100, offset, crs } = options;

    const params: Record<string, string | number | undefined> = { limit, offset };

    // Only send CRS params if explicitly set — omitting them means API default (WGS84/CRS84)
    if (crs) {
      // SGU OGC API accepts short CRS format (EPSG:3006), not full OGC URN
      params['crs'] = crs;
      params['bbox-crs'] = crs;
    }

    if (polygonWkt) {
      params.filter = `INTERSECTS(geom,${polygonWkt})`;
      params['filter-lang'] = 'cql-text';
      params['filter-crs'] = filterCrs ?? crs ?? CRS_SWEREF99TM;
    } else if (bbox) {
      params.bbox = bboxToString(bbox);
    }

    try {
      const response = await client.request<OgcFeaturesResponse<T>>(
        `collections/${collection}/items`,
        { params },
      );
      return { features: response.features, numberMatched: response.numberMatched };
    } catch (error) {
      if (error instanceof UpstreamApiError) {
        throw error;
      }
      throw new UpstreamApiError(
        'Failed to fetch features for this area. The data service may be temporarily unavailable — try again.',
        0,
        config.baseUrl,
      );
    }
  }

  async function getItems<T>(collection: string, options: QueryOptions = {}): Promise<T[]> {
    const result = await getItemsWithCount<T>(collection, options);
    return result.features;
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
    getItemsWithCount,
    getCollections,
    getFeature,
  };
}
