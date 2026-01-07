import { createOgcClient } from '@/lib/ogc-client';
import { createWmsClient } from '@/lib/wms-client';
import { BoundingBox, Point, Corridor, corridorToWktPolygon, corridorToBoundingBox } from '@/lib/geometry-utils';
import {
  SguBedrockFeature,
  BedrockFeature,
  SoilTypeInfo,
  MapOptions,
  MapResponse,
  SguSoilTypeInfoResponse,
  transformBedrockFeature,
  transformSoilTypeInfo,
} from '@/types/sgu-api';

// ============================================================================
// SGU API Endpoints
// ============================================================================

const SGU_OGC_BEDROCK_URL = 'https://api.sgu.se/oppnadata/berggrund50k-250k/ogc/features/v1';
// WMS GetMap endpoints (different from GetCapabilities endpoints)
const SGU_WMS_BEDROCK_URL = 'https://maps3.sgu.se/geoserver/berg/ows';
const SGU_WMS_SOIL_TYPES_URL = 'https://maps3.sgu.se/geoserver/jord/ows';
const SGU_WMS_GROUNDWATER_URL = 'https://maps3.sgu.se/geoserver/ows';

// ============================================================================
// Client instances
// ============================================================================

const bedrockOgcClient = createOgcClient({
  baseUrl: SGU_OGC_BEDROCK_URL,
  timeout: 30000,
});

const bedrockWmsClient = createWmsClient({
  baseUrl: SGU_WMS_BEDROCK_URL,
  timeout: 30000,
});

const soilTypesWmsClient = createWmsClient({
  baseUrl: SGU_WMS_SOIL_TYPES_URL,
  timeout: 30000,
});

const groundwaterWmsClient = createWmsClient({
  baseUrl: SGU_WMS_GROUNDWATER_URL,
  timeout: 30000,
});

// ============================================================================
// WMS Layers (INSPIRE-style layer names)
// ============================================================================

const BEDROCK_LAYERS = ['SE.GOV.SGU.BERG.GEOLOGISK_ENHET.YTA.50K'];
const SOIL_TYPES_LAYERS = ['SE.GOV.SGU.JORD.GRUNDLAGER.25K'];
const BOULDER_COVERAGE_LAYERS = ['SE.GOV.SGU.JORD.BLOCKIGHET.25K'];
const SOIL_DEPTH_LAYERS = ['SE.GOV.SGU.JORD.JORDDJUP.50K'];
const GROUNDWATER_LAYERS = ['SE.GOV.SGU.HMAG.GRUNDVATTENMAGASIN_J1.V2'];
const LANDSLIDE_LAYERS = ['SE.GOV.SGU.JORD.SKRED'];

// ============================================================================
// Cached legend URLs (static, only depend on layer name)
// ============================================================================

const LEGEND_URLS = {
  bedrock: `${SGU_WMS_BEDROCK_URL}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&LAYER=${BEDROCK_LAYERS[0]}&FORMAT=image%2Fpng`,
  soilTypes: `${SGU_WMS_SOIL_TYPES_URL}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&LAYER=${SOIL_TYPES_LAYERS[0]}&FORMAT=image%2Fpng`,
  boulderCoverage: `${SGU_WMS_SOIL_TYPES_URL}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&LAYER=${BOULDER_COVERAGE_LAYERS[0]}&FORMAT=image%2Fpng`,
  soilDepth: `${SGU_WMS_SOIL_TYPES_URL}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&LAYER=${SOIL_DEPTH_LAYERS[0]}&FORMAT=image%2Fpng`,
  groundwater: `${SGU_WMS_GROUNDWATER_URL}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&LAYER=${GROUNDWATER_LAYERS[0]}&FORMAT=image%2Fpng`,
  landslide: `${SGU_WMS_SOIL_TYPES_URL}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&LAYER=${LANDSLIDE_LAYERS[0]}&FORMAT=image%2Fpng`,
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build a MapResponse object
 * Reduces duplication across all map URL methods
 */
function buildMapResponse(mapUrl: string, legendUrl: string, bbox: BoundingBox, layers: string[]): MapResponse {
  return {
    map_url: mapUrl,
    legend_url: legendUrl,
    bbox: {
      minX: bbox.minX,
      minY: bbox.minY,
      maxX: bbox.maxX,
      maxY: bbox.maxY,
    },
    coordinate_system: 'EPSG:3006',
    layers,
  };
}

// ============================================================================
// SGU Client API
// ============================================================================

export const sguClient = {
  /**
   * Get bedrock features within a bounding box or corridor
   * Uses the 'geologisk-enhet-yta' collection (geological unit areas)
   *
   * When corridor is provided, uses polygon intersection filter for precise filtering.
   * Falls back to bbox if corridor not provided.
   */
  async getBedrock(
    bbox: BoundingBox,
    limit: number = 100,
    corridor?: Corridor,
  ): Promise<{ features: BedrockFeature[]; usedPolygonFilter: boolean }> {
    let polygonWkt: string | undefined;
    let usedPolygonFilter = false;

    // If corridor is provided, try polygon filtering first
    if (corridor) {
      try {
        polygonWkt = corridorToWktPolygon(corridor);
        usedPolygonFilter = true;
      } catch {
        // Fall back to bbox if polygon generation fails
        polygonWkt = undefined;
      }
    }

    try {
      const features = await bedrockOgcClient.getItems<SguBedrockFeature>('geologisk-enhet-yta', {
        bbox: usedPolygonFilter ? undefined : bbox,
        polygonWkt,
        limit,
      });
      return {
        features: features.map(transformBedrockFeature),
        usedPolygonFilter,
      };
    } catch {
      // If polygon filter fails (API might not support it), fall back to bbox
      if (usedPolygonFilter) {
        const features = await bedrockOgcClient.getItems<SguBedrockFeature>('geologisk-enhet-yta', {
          bbox,
          limit,
        });
        return {
          features: features.map(transformBedrockFeature),
          usedPolygonFilter: false,
        };
      }
      throw new Error('Failed to fetch bedrock data');
    }
  },

  /**
   * Get a bedrock map URL for a bounding box
   */
  getBedrockMapUrl(bbox: BoundingBox, options: MapOptions = {}): MapResponse {
    const { width = 800, height = 600, format = 'png' } = options;

    const mapUrl = bedrockWmsClient.getMapUrl({
      layers: BEDROCK_LAYERS,
      bbox,
      width,
      height,
      format: format === 'jpeg' ? 'image/jpeg' : 'image/png',
    });

    return buildMapResponse(mapUrl, LEGEND_URLS.bedrock, bbox, BEDROCK_LAYERS);
  },

  /**
   * Get a soil types map URL for a bounding box
   */
  getSoilTypesMapUrl(bbox: BoundingBox, options: MapOptions = {}): MapResponse {
    const { width = 800, height = 600, format = 'png' } = options;

    const mapUrl = soilTypesWmsClient.getMapUrl({
      layers: SOIL_TYPES_LAYERS,
      bbox,
      width,
      height,
      format: format === 'jpeg' ? 'image/jpeg' : 'image/png',
    });

    return buildMapResponse(mapUrl, LEGEND_URLS.soilTypes, bbox, SOIL_TYPES_LAYERS);
  },

  /**
   * Get a boulder coverage map URL for a bounding box
   * Shows blockiness/boulder density in the soil
   */
  getBoulderCoverageMapUrl(bbox: BoundingBox, options: MapOptions = {}): MapResponse {
    const { width = 800, height = 600, format = 'png' } = options;

    const mapUrl = soilTypesWmsClient.getMapUrl({
      layers: BOULDER_COVERAGE_LAYERS,
      bbox,
      width,
      height,
      format: format === 'jpeg' ? 'image/jpeg' : 'image/png',
    });

    return buildMapResponse(mapUrl, LEGEND_URLS.boulderCoverage, bbox, BOULDER_COVERAGE_LAYERS);
  },

  /**
   * Get a soil depth map URL for a bounding box
   * Shows estimated depth to bedrock
   */
  getSoilDepthMapUrl(bbox: BoundingBox, options: MapOptions = {}): MapResponse {
    const { width = 800, height = 600, format = 'png' } = options;

    const mapUrl = soilTypesWmsClient.getMapUrl({
      layers: SOIL_DEPTH_LAYERS,
      bbox,
      width,
      height,
      format: format === 'jpeg' ? 'image/jpeg' : 'image/png',
    });

    return buildMapResponse(mapUrl, LEGEND_URLS.soilDepth, bbox, SOIL_DEPTH_LAYERS);
  },

  /**
   * Get soil type info at a specific point using WMS GetFeatureInfo
   */
  async getSoilTypeAt(point: Point): Promise<SoilTypeInfo | null> {
    // Create a small bbox around the point for the GetFeatureInfo request
    const buffer = 100; // 100 meter buffer
    const bbox: BoundingBox = {
      minX: point.x - buffer,
      minY: point.y - buffer,
      maxX: point.x + buffer,
      maxY: point.y + buffer,
    };

    // Use standard image dimensions
    const width = 256;
    const height = 256;

    // Calculate pixel position (center of image)
    const pixelX = Math.floor(width / 2);
    const pixelY = Math.floor(height / 2);

    const response = await soilTypesWmsClient.getFeatureInfo<SguSoilTypeInfoResponse>({
      layers: SOIL_TYPES_LAYERS,
      bbox,
      width,
      height,
      x: pixelX,
      y: pixelY,
    });

    return transformSoilTypeInfo(response);
  },

  /**
   * Get a groundwater aquifers map URL for a bounding box
   * Shows groundwater reservoirs/aquifers in soil layers (J1)
   */
  getGroundwaterMapUrl(bbox: BoundingBox, options: MapOptions = {}): MapResponse {
    const { width = 800, height = 600, format = 'png' } = options;

    const mapUrl = groundwaterWmsClient.getMapUrl({
      layers: GROUNDWATER_LAYERS,
      bbox,
      width,
      height,
      format: format === 'jpeg' ? 'image/jpeg' : 'image/png',
    });

    return buildMapResponse(mapUrl, LEGEND_URLS.groundwater, bbox, GROUNDWATER_LAYERS);
  },

  /**
   * Get a landslide map URL for a bounding box
   * Shows historical landslide areas
   */
  getLandslideMapUrl(bbox: BoundingBox, options: MapOptions = {}): MapResponse {
    const { width = 800, height = 600, format = 'png' } = options;

    const mapUrl = soilTypesWmsClient.getMapUrl({
      layers: LANDSLIDE_LAYERS,
      bbox,
      width,
      height,
      format: format === 'jpeg' ? 'image/jpeg' : 'image/png',
    });

    return buildMapResponse(mapUrl, LEGEND_URLS.landslide, bbox, LANDSLIDE_LAYERS);
  },
};
