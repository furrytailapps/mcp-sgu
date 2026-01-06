import { createHttpClient } from './http-client';
import { UpstreamApiError } from './errors';
import { BoundingBox, CRS_SWEREF99TM } from './geometry-utils';

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

/**
 * Create a WMS client
 */
export function createWmsClient(config: WmsClientConfig) {
  const client = createHttpClient({
    baseUrl: config.baseUrl,
    timeout: config.timeout ?? 30000,
  });

  /**
   * Build a WMS GetMap URL (returns URL string, doesn't fetch the image)
   */
  function getMapUrl(options: GetMapOptions): string {
    const { layers, bbox, width = 800, height = 600, format = 'image/png', crs = CRS_SWEREF99TM, transparent = true } = options;

    const params = new URLSearchParams({
      SERVICE: 'WMS',
      VERSION: '1.3.0',
      REQUEST: 'GetMap',
      LAYERS: layers.join(','),
      // WMS 1.3.0 uses CRS parameter and axis order depends on CRS
      // For EPSG:3006, the axis order is Easting, Northing (x, y)
      CRS: crs,
      BBOX: `${bbox.minY},${bbox.minX},${bbox.maxY},${bbox.maxX}`, // WMS 1.3.0 axis order for EPSG:3006
      WIDTH: String(width),
      HEIGHT: String(height),
      FORMAT: format,
      TRANSPARENT: String(transparent),
    });

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
      VERSION: '1.3.0',
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

    const params: Record<string, string | number> = {
      SERVICE: 'WMS',
      VERSION: '1.3.0',
      REQUEST: 'GetFeatureInfo',
      LAYERS: layers.join(','),
      QUERY_LAYERS: layers.join(','),
      CRS: crs,
      // WMS 1.3.0 axis order for EPSG:3006
      BBOX: `${bbox.minY},${bbox.minX},${bbox.maxY},${bbox.maxX}`,
      WIDTH: width,
      HEIGHT: height,
      I: x,
      J: y,
      INFO_FORMAT: infoFormat,
    };

    try {
      const response = await client.request<T>('', { params });
      return response;
    } catch (error) {
      if (error instanceof UpstreamApiError) {
        throw error;
      }
      throw new UpstreamApiError(
        `WMS GetFeatureInfo failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
