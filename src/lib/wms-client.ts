import { createHttpClient } from './http-client';
import { UpstreamApiError } from './errors';
import { BoundingBox } from './geometry-utils';
import { CRS_SWEREF99TM } from './coordinates';

interface WmsClientConfig {
  baseUrl: string;
  timeout?: number;
}

interface GetMapOptions {
  layers: string[];
  bbox: BoundingBox;
  width?: number;
  height?: number;
  format?: 'image/png' | 'image/jpeg';
  crs?: string;
  transparent?: boolean;
}

interface GetFeatureInfoOptions {
  layers: string[];
  bbox: BoundingBox;
  width: number;
  height: number;
  x: number; // Pixel X coordinate
  y: number; // Pixel Y coordinate
  infoFormat?: string;
  crs?: string;
}

export function createWmsClient(config: WmsClientConfig) {
  const client = createHttpClient({
    baseUrl: config.baseUrl,
    timeout: config.timeout ?? 30000,
  });

  function getMapUrl(options: GetMapOptions): string {
    const { layers, bbox, width = 800, height = 600, format = 'image/png', crs = CRS_SWEREF99TM, transparent = true } =
      options;

    const params = new URLSearchParams({
      SERVICE: 'WMS',
      VERSION: '1.3.0',
      REQUEST: 'GetMap',
      LAYERS: layers.join(','),
      WIDTH: String(width),
      HEIGHT: String(height),
      FORMAT: format,
      TRANSPARENT: String(transparent),
    });

    params.set('CRS', crs);
    // WMS 1.3.0 axis order for EPSG:3006 (Y,X order per CRS definition)
    params.set('BBOX', `${bbox.minY},${bbox.minX},${bbox.maxY},${bbox.maxX}`);

    const baseUrl = config.baseUrl.endsWith('?') ? config.baseUrl.slice(0, -1) : config.baseUrl;
    return `${baseUrl}?${params.toString()}`;
  }

  async function getFeatureInfo<T>(options: GetFeatureInfoOptions): Promise<T> {
    const { layers, bbox, width, height, x, y, infoFormat = 'application/json', crs = CRS_SWEREF99TM } = options;

    const params: Record<string, string | number> = {
      SERVICE: 'WMS',
      VERSION: '1.3.0',
      REQUEST: 'GetFeatureInfo',
      LAYERS: layers.join(','),
      QUERY_LAYERS: layers.join(','),
      WIDTH: width,
      HEIGHT: height,
      INFO_FORMAT: infoFormat,
    };

    params.CRS = crs;
    // WMS 1.3.0 axis order for EPSG:3006
    params.BBOX = `${bbox.minY},${bbox.minX},${bbox.maxY},${bbox.maxX}`;
    params.I = x;
    params.J = y;

    try {
      const response = await client.request<T>('', { params });
      return response;
    } catch (error) {
      if (error instanceof UpstreamApiError) {
        throw error;
      }
      throw new UpstreamApiError(
        'Failed to query geological data at this location. The data service may be temporarily unavailable — try again.',
        0,
        config.baseUrl,
      );
    }
  }

  return {
    getMapUrl,
    getFeatureInfo,
  };
}
