import { createHttpClient } from './http-client';
import { UpstreamApiError } from './errors';
import { BoundingBox, CRS_SWEREF99TM } from './geometry-utils';

interface WmsClientConfig {
  baseUrl: string;
  timeout?: number;
  version?: '1.1.1' | '1.3.0'; // Default: 1.3.0
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

/**
 * Create a WMS client
 */
export function createWmsClient(config: WmsClientConfig) {
  const client = createHttpClient({
    baseUrl: config.baseUrl,
    timeout: config.timeout ?? 30000,
  });
  const wmsVersion = config.version ?? '1.3.0';

  /**
   * Build a WMS GetMap URL (returns URL string, doesn't fetch the image)
   */
  function getMapUrl(options: GetMapOptions): string {
    const { layers, bbox, width = 800, height = 600, format = 'image/png', crs = CRS_SWEREF99TM, transparent = true } = options;

    // WMS 1.1.1 vs 1.3.0 differences:
    // - 1.1.1: SRS parameter, BBOX order is minX,minY,maxX,maxY
    // - 1.3.0: CRS parameter, BBOX axis order depends on CRS definition
    const params = new URLSearchParams({
      SERVICE: 'WMS',
      VERSION: wmsVersion,
      REQUEST: 'GetMap',
      LAYERS: layers.join(','),
      WIDTH: String(width),
      HEIGHT: String(height),
      FORMAT: format,
      TRANSPARENT: String(transparent),
    });

    if (wmsVersion === '1.1.1') {
      params.set('SRS', crs);
      params.set('BBOX', `${bbox.minX},${bbox.minY},${bbox.maxX},${bbox.maxY}`);
    } else {
      params.set('CRS', crs);
      // WMS 1.3.0 axis order for EPSG:3006 (Y,X order per CRS definition)
      params.set('BBOX', `${bbox.minY},${bbox.minX},${bbox.maxY},${bbox.maxX}`);
    }

    // Build the full URL
    const baseUrl = config.baseUrl.endsWith('?') ? config.baseUrl.slice(0, -1) : config.baseUrl;
    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Build a WMS GetLegendGraphic URL
   */
  function getLegendUrl(layer: string, format: string = 'image/png'): string {
    const params = new URLSearchParams({
      SERVICE: 'WMS',
      VERSION: wmsVersion,
      REQUEST: 'GetLegendGraphic',
      LAYER: layer,
      FORMAT: format,
    });

    const baseUrl = config.baseUrl.endsWith('?') ? config.baseUrl.slice(0, -1) : config.baseUrl;
    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Perform a GetFeatureInfo request
   */
  async function getFeatureInfo<T>(options: GetFeatureInfoOptions): Promise<T> {
    const { layers, bbox, width, height, x, y, infoFormat = 'application/json', crs = CRS_SWEREF99TM } = options;

    // WMS 1.1.1 vs 1.3.0 differences:
    // - 1.1.1: X, Y for pixel coords, SRS for CRS, BBOX order is minX,minY,maxX,maxY
    // - 1.3.0: I, J for pixel coords, CRS for CRS, BBOX axis order depends on CRS
    const params: Record<string, string | number> = {
      SERVICE: 'WMS',
      VERSION: wmsVersion,
      REQUEST: 'GetFeatureInfo',
      LAYERS: layers.join(','),
      QUERY_LAYERS: layers.join(','),
      WIDTH: width,
      HEIGHT: height,
      INFO_FORMAT: infoFormat,
    };

    if (wmsVersion === '1.1.1') {
      params.SRS = crs;
      params.BBOX = `${bbox.minX},${bbox.minY},${bbox.maxX},${bbox.maxY}`;
      params.X = x;
      params.Y = y;
    } else {
      params.CRS = crs;
      // WMS 1.3.0 axis order for EPSG:3006
      params.BBOX = `${bbox.minY},${bbox.minX},${bbox.maxY},${bbox.maxX}`;
      params.I = x;
      params.J = y;
    }

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

  /**
   * Get WMS capabilities (for discovering available layers)
   */
  async function getCapabilities(): Promise<string> {
    const params: Record<string, string> = {
      SERVICE: 'WMS',
      VERSION: '1.3.0',
      REQUEST: 'GetCapabilities',
    };

    return client.request<string>('', { params });
  }

  return {
    getMapUrl,
    getLegendUrl,
    getFeatureInfo,
    getCapabilities,
  };
}
