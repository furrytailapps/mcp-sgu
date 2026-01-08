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
  // Point query types
  SguBedrockInfoResponse,
  SguSoilDepthInfoResponse,
  SguBoulderCoverageInfoResponse,
  SguGroundwaterInfoResponse,
  SguLandslideInfoResponse,
  SguGroundwaterVulnerabilityInfoResponse,
  SguRadonRiskInfoResponse,
  SguWellPointInfoResponse,
  BedrockInfo,
  SoilDepthInfo,
  BoulderCoverageInfo,
  GroundwaterInfo,
  LandslideInfo,
  GroundwaterVulnerabilityInfo,
  RadonRiskInfo,
  WellPointInfo,
  transformBedrockInfo,
  transformSoilDepthInfo,
  transformBoulderCoverageInfo,
  transformGroundwaterInfo,
  transformLandslideInfo,
  transformGroundwaterVulnerabilityInfo,
  transformRadonRiskInfo,
  transformWellPointInfo,
} from '@/types/sgu-api';

// ============================================================================
// SGU API Endpoints
// ============================================================================

const SGU_OGC_BEDROCK_URL = 'https://api.sgu.se/oppnadata/berggrund50k-250k/ogc/features/v1';
// WMS GetMap endpoints (different from GetCapabilities endpoints)
const SGU_WMS_BEDROCK_URL = 'https://maps3.sgu.se/geoserver/berg/ows';
const SGU_WMS_SOIL_TYPES_URL = 'https://maps3.sgu.se/geoserver/jord/ows';
const SGU_WMS_GROUNDWATER_URL = 'https://maps3.sgu.se/geoserver/ows';
// Legacy resource.sgu.se WMS endpoints (support both GetMap and GetFeatureInfo with qualified layer names)
const SGU_WMS_GAMMA_URL = 'https://resource.sgu.se/service/wms/130/flyggeofysik-gammastralning-uran';
const SGU_WMS_WELLS_URL = 'https://resource.sgu.se/service/wms/130/brunnar';
const SGU_WMS_BALLAST_URL = 'https://resource.sgu.se/service/wms/130/ballast';

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

// Legacy resource.sgu.se clients (use WMS 1.3.0 - server auto-upgrades 1.1.1 requests)
const gammaWmsClient = createWmsClient({
  baseUrl: SGU_WMS_GAMMA_URL,
  timeout: 30000,
});

const wellsWmsClient = createWmsClient({
  baseUrl: SGU_WMS_WELLS_URL,
  timeout: 30000,
});

const ballastWmsClient = createWmsClient({
  baseUrl: SGU_WMS_BALLAST_URL,
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
// Legacy layers (resource.sgu.se uses simple layer names for both GetMap and GetFeatureInfo)
const RADON_RISK_LAYERS = ['Uran'];
const WELLS_LAYERS = ['Brunnar'];
// Groundwater vulnerability (on maps3.sgu.se)
const GROUNDWATER_VULNERABILITY_LAYERS = ['SE.GOV.SGU.GRUNDVATTEN.SARBARHET_3KL'];
// Construction materials/ballast (on resource.sgu.se)
const GRAVEL_DEPOSITS_LAYERS = ['SE.GOV.SGU.BALLAST.GRUSFOREKOMSTER'];
const ROCK_DEPOSITS_LAYERS = ['SE.GOV.SGU.BALLAST.BERGFOREKOMSTER'];

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
  radonRisk: `${SGU_WMS_GAMMA_URL}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetLegendGraphic&LAYER=${RADON_RISK_LAYERS[0]}&FORMAT=image%2Fpng`,
  wells: `${SGU_WMS_WELLS_URL}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetLegendGraphic&LAYER=${WELLS_LAYERS[0]}&FORMAT=image%2Fpng`,
  groundwaterVulnerability: `${SGU_WMS_GROUNDWATER_URL}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&LAYER=${GROUNDWATER_VULNERABILITY_LAYERS[0]}&FORMAT=image%2Fpng`,
  gravelDeposits: `${SGU_WMS_BALLAST_URL}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetLegendGraphic&LAYER=${GRAVEL_DEPOSITS_LAYERS[0]}&FORMAT=image%2Fpng`,
  rockDeposits: `${SGU_WMS_BALLAST_URL}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetLegendGraphic&LAYER=${ROCK_DEPOSITS_LAYERS[0]}&FORMAT=image%2Fpng`,
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

/**
 * Factory function to create map URL methods
 * Eliminates repetitive boilerplate across all map methods
 */
function createMapUrlMethod(
  wmsClient: ReturnType<typeof createWmsClient>,
  layers: string[],
  legendKey: keyof typeof LEGEND_URLS,
): (bbox: BoundingBox, options?: MapOptions) => MapResponse {
  return (bbox: BoundingBox, options: MapOptions = {}): MapResponse => {
    const { width = 800, height = 600, format = 'png' } = options;
    const mapUrl = wmsClient.getMapUrl({
      layers,
      bbox,
      width,
      height,
      format: format === 'jpeg' ? 'image/jpeg' : 'image/png',
    });
    return buildMapResponse(mapUrl, LEGEND_URLS[legendKey], bbox, layers);
  };
}

/**
 * Factory function to create point query methods
 * Eliminates repetitive boilerplate across all point query methods
 */
function createPointQueryMethod<TResponse, TResult>(
  wmsClient: ReturnType<typeof createWmsClient>,
  layers: string[],
  transform: (response: TResponse) => TResult | null,
): (point: Point) => Promise<TResult | null> {
  return async (point: Point): Promise<TResult | null> => {
    // Create a small bbox around the point for GetFeatureInfo
    const buffer = 100; // 100 meter buffer
    const bbox: BoundingBox = {
      minX: point.x - buffer,
      minY: point.y - buffer,
      maxX: point.x + buffer,
      maxY: point.y + buffer,
    };

    // Standard image dimensions
    const width = 256;
    const height = 256;

    // Calculate pixel position (center of image)
    const pixelX = Math.floor(width / 2);
    const pixelY = Math.floor(height / 2);

    const response = await wmsClient.getFeatureInfo<TResponse>({
      layers,
      bbox,
      width,
      height,
      x: pixelX,
      y: pixelY,
    });

    return transform(response);
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

  /** Get a bedrock map URL for a bounding box */
  getBedrockMapUrl: createMapUrlMethod(bedrockWmsClient, BEDROCK_LAYERS, 'bedrock'),

  /** Get a soil types map URL for a bounding box */
  getSoilTypesMapUrl: createMapUrlMethod(soilTypesWmsClient, SOIL_TYPES_LAYERS, 'soilTypes'),

  /** Get a boulder coverage map URL (shows blockiness/boulder density) */
  getBoulderCoverageMapUrl: createMapUrlMethod(soilTypesWmsClient, BOULDER_COVERAGE_LAYERS, 'boulderCoverage'),

  /** Get a soil depth map URL (shows estimated depth to bedrock) */
  getSoilDepthMapUrl: createMapUrlMethod(soilTypesWmsClient, SOIL_DEPTH_LAYERS, 'soilDepth'),

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

  /** Get a groundwater aquifers map URL (shows groundwater reservoirs in J1 soil layers) */
  getGroundwaterMapUrl: createMapUrlMethod(groundwaterWmsClient, GROUNDWATER_LAYERS, 'groundwater'),

  /** Get a landslide map URL (shows historical landslide areas) */
  getLandslideMapUrl: createMapUrlMethod(soilTypesWmsClient, LANDSLIDE_LAYERS, 'landslide'),

  /** Get a radon risk map URL (gamma radiation/uranium as proxy for radon) */
  getRadonRiskMapUrl: createMapUrlMethod(gammaWmsClient, RADON_RISK_LAYERS, 'radonRisk'),

  /** Get a wells map URL (shows groundwater wells and boreholes) */
  getWellsMapUrl: createMapUrlMethod(wellsWmsClient, WELLS_LAYERS, 'wells'),

  /** Get a groundwater vulnerability map URL (3-class vulnerability assessment) */
  getGroundwaterVulnerabilityMapUrl: createMapUrlMethod(
    groundwaterWmsClient,
    GROUNDWATER_VULNERABILITY_LAYERS,
    'groundwaterVulnerability',
  ),

  /** Get a gravel deposits map URL (shows sand and gravel occurrences for construction materials) */
  getGravelDepositsMapUrl: createMapUrlMethod(ballastWmsClient, GRAVEL_DEPOSITS_LAYERS, 'gravelDeposits'),

  /** Get a rock deposits map URL (shows rock occurrences for construction materials) */
  getRockDepositsMapUrl: createMapUrlMethod(ballastWmsClient, ROCK_DEPOSITS_LAYERS, 'rockDeposits'),

  // ==========================================================================
  // Point Query Methods (WMS GetFeatureInfo)
  // ==========================================================================

  /** Get bedrock info at a specific point using WMS GetFeatureInfo */
  getBedrockAt: createPointQueryMethod<SguBedrockInfoResponse, BedrockInfo>(
    bedrockWmsClient,
    BEDROCK_LAYERS,
    transformBedrockInfo,
  ),

  /** Get soil depth info at a specific point */
  getSoilDepthAt: createPointQueryMethod<SguSoilDepthInfoResponse, SoilDepthInfo>(
    soilTypesWmsClient,
    SOIL_DEPTH_LAYERS,
    transformSoilDepthInfo,
  ),

  /** Get boulder coverage info at a specific point */
  getBoulderCoverageAt: createPointQueryMethod<SguBoulderCoverageInfoResponse, BoulderCoverageInfo>(
    soilTypesWmsClient,
    BOULDER_COVERAGE_LAYERS,
    transformBoulderCoverageInfo,
  ),

  /** Get groundwater aquifer info at a specific point */
  getGroundwaterAt: createPointQueryMethod<SguGroundwaterInfoResponse, GroundwaterInfo>(
    groundwaterWmsClient,
    GROUNDWATER_LAYERS,
    transformGroundwaterInfo,
  ),

  /** Get landslide area info at a specific point */
  getLandslideAt: createPointQueryMethod<SguLandslideInfoResponse, LandslideInfo>(
    soilTypesWmsClient,
    LANDSLIDE_LAYERS,
    transformLandslideInfo,
  ),

  /** Get groundwater vulnerability info at a specific point */
  getGroundwaterVulnerabilityAt: createPointQueryMethod<SguGroundwaterVulnerabilityInfoResponse, GroundwaterVulnerabilityInfo>(
    groundwaterWmsClient,
    GROUNDWATER_VULNERABILITY_LAYERS,
    transformGroundwaterVulnerabilityInfo,
  ),

  /** Get radon risk info at a specific point (gamma radiation/uranium as proxy) */
  getRadonRiskAt: createPointQueryMethod<SguRadonRiskInfoResponse, RadonRiskInfo>(
    gammaWmsClient,
    RADON_RISK_LAYERS,
    transformRadonRiskInfo,
  ),

  /** Get well/borehole info at a specific point */
  getWellAt: createPointQueryMethod<SguWellPointInfoResponse, WellPointInfo>(
    wellsWmsClient,
    WELLS_LAYERS,
    transformWellPointInfo,
  ),
};
