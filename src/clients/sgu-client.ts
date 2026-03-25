import { createWmsClient } from '@/lib/wms-client';
import { BoundingBox, Point } from '@/lib/geometry-utils';
import { MapOptions, MapResponse } from '@/types/common-schemas';
import {
  SoilTypeInfo,
  SguSoilTypeInfoResponse,
  transformSoilTypeInfo,
  SguBedrockInfoResponse,
  SguSoilDepthInfoResponse,
  SguGroundwaterInfoResponse,
  SguLandslideInfoResponse,
  SguGroundwaterVulnerabilityInfoResponse,
  SguRadonRiskInfoResponse,
  SguWellPointInfoResponse,
  BedrockInfo,
  SoilDepthInfo,
  GroundwaterInfo,
  LandslideInfo,
  GroundwaterVulnerabilityInfo,
  RadonRiskInfo,
  WellPointInfo,
  transformBedrockInfo,
  transformSoilDepthInfo,
  transformGroundwaterInfo,
  transformLandslideInfo,
  transformGroundwaterVulnerabilityInfo,
  transformRadonRiskInfo,
  transformWellPointInfo,
} from '@/types/point-queries';

// ============================================================================
// SGU API Endpoints
// ============================================================================

// WMS GetMap endpoints (different from GetCapabilities endpoints)
const SGU_WMS_BEDROCK_URL = 'https://maps3.sgu.se/geoserver/berg/ows';
const SGU_WMS_SOIL_TYPES_URL = 'https://maps3.sgu.se/geoserver/jord/ows';
const SGU_WMS_SOIL_DEPTH_URL = 'https://maps3.sgu.se/geoserver/misc/ows';
const SGU_WMS_GROUNDWATER_URL = 'https://maps3.sgu.se/geoserver/ows';
const SGU_WMS_GAMMA_URL = 'https://maps3.sgu.se/geoserver/fysik/ows';
const SGU_WMS_WELLS_URL = 'https://maps3.sgu.se/geoserver/grundvatten/ows';
// Legacy resource.sgu.se WMS endpoints
const SGU_WMS_BALLAST_URL = 'https://resource.sgu.se/service/wms/130/ballast';

// ============================================================================
// Client instances
// ============================================================================

const bedrockWmsClient = createWmsClient({
  baseUrl: SGU_WMS_BEDROCK_URL,
  timeout: 30000,
});

const soilTypesWmsClient = createWmsClient({
  baseUrl: SGU_WMS_SOIL_TYPES_URL,
  timeout: 30000,
});

const soilDepthWmsClient = createWmsClient({
  baseUrl: SGU_WMS_SOIL_DEPTH_URL,
  timeout: 30000,
});

const groundwaterWmsClient = createWmsClient({
  baseUrl: SGU_WMS_GROUNDWATER_URL,
  timeout: 30000,
});

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
const SOIL_DEPTH_LAYERS = ['SE.GOV.SGU.MISC.JORDDJUPSMODELL.RASTER_INTERVALL'];
const GROUNDWATER_LAYERS = ['SE.GOV.SGU.HMAG.GRUNDVATTENMAGASIN_J1.V2'];
const LANDSLIDE_LAYERS = ['SE.GOV.SGU.JORD.SKRED'];
const RADON_RISK_LAYERS = ['SE.GOV.SGU.URAN'];
const WELLS_LAYERS = ['SE.GOV.SGU.BRUNNAR.250K'];
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
  soilDepth: `${SGU_WMS_SOIL_DEPTH_URL}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&LAYER=${SOIL_DEPTH_LAYERS[0]}&FORMAT=image%2Fpng`,
  groundwater: `${SGU_WMS_GROUNDWATER_URL}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&LAYER=${GROUNDWATER_LAYERS[0]}&FORMAT=image%2Fpng`,
  landslide: `${SGU_WMS_SOIL_TYPES_URL}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&LAYER=${LANDSLIDE_LAYERS[0]}&FORMAT=image%2Fpng`,
  radonRisk: `${SGU_WMS_GAMMA_URL}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&LAYER=${RADON_RISK_LAYERS[0]}&FORMAT=image%2Fpng`,
  wells: `${SGU_WMS_WELLS_URL}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&LAYER=${WELLS_LAYERS[0]}&FORMAT=image%2Fpng`,
  groundwaterVulnerability: `${SGU_WMS_GROUNDWATER_URL}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&LAYER=${GROUNDWATER_VULNERABILITY_LAYERS[0]}&FORMAT=image%2Fpng`,
  gravelDeposits: `${SGU_WMS_BALLAST_URL}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetLegendGraphic&LAYER=${GRAVEL_DEPOSITS_LAYERS[0]}&FORMAT=image%2Fpng`,
  rockDeposits: `${SGU_WMS_BALLAST_URL}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetLegendGraphic&LAYER=${ROCK_DEPOSITS_LAYERS[0]}&FORMAT=image%2Fpng`,
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

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

function createPointQueryMethod<TResponse, TResult>(
  wmsClient: ReturnType<typeof createWmsClient>,
  layers: string[],
  transform: (response: TResponse) => TResult | null,
  bufferMeters: number = 100,
): (point: Point) => Promise<TResult | null> {
  return async (point: Point): Promise<TResult | null> => {
    const buffer = bufferMeters;
    const bbox: BoundingBox = {
      minX: point.x - buffer,
      minY: point.y - buffer,
      maxX: point.x + buffer,
      maxY: point.y + buffer,
    };

    const width = 256;
    const height = 256;
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
  getBedrockMapUrl: createMapUrlMethod(bedrockWmsClient, BEDROCK_LAYERS, 'bedrock'),
  getSoilTypesMapUrl: createMapUrlMethod(soilTypesWmsClient, SOIL_TYPES_LAYERS, 'soilTypes'),
  getBoulderCoverageMapUrl: createMapUrlMethod(soilTypesWmsClient, BOULDER_COVERAGE_LAYERS, 'boulderCoverage'),
  getSoilDepthMapUrl: createMapUrlMethod(soilDepthWmsClient, SOIL_DEPTH_LAYERS, 'soilDepth'),

  getSoilTypeAt: createPointQueryMethod<SguSoilTypeInfoResponse, SoilTypeInfo>(
    soilTypesWmsClient,
    SOIL_TYPES_LAYERS,
    transformSoilTypeInfo,
  ),

  getGroundwaterMapUrl: createMapUrlMethod(groundwaterWmsClient, GROUNDWATER_LAYERS, 'groundwater'),
  getLandslideMapUrl: createMapUrlMethod(soilTypesWmsClient, LANDSLIDE_LAYERS, 'landslide'),
  getRadonRiskMapUrl: createMapUrlMethod(gammaWmsClient, RADON_RISK_LAYERS, 'radonRisk'),
  getWellsMapUrl: createMapUrlMethod(wellsWmsClient, WELLS_LAYERS, 'wells'),
  getGroundwaterVulnerabilityMapUrl: createMapUrlMethod(
    groundwaterWmsClient,
    GROUNDWATER_VULNERABILITY_LAYERS,
    'groundwaterVulnerability',
  ),

  getGravelDepositsMapUrl: createMapUrlMethod(ballastWmsClient, GRAVEL_DEPOSITS_LAYERS, 'gravelDeposits'),
  getRockDepositsMapUrl: createMapUrlMethod(ballastWmsClient, ROCK_DEPOSITS_LAYERS, 'rockDeposits'),

  // ==========================================================================
  // Point Query Methods (WMS GetFeatureInfo)
  // ==========================================================================

  getBedrockAt: createPointQueryMethod<SguBedrockInfoResponse, BedrockInfo>(
    bedrockWmsClient,
    BEDROCK_LAYERS,
    transformBedrockInfo,
  ),

  getSoilDepthAt: createPointQueryMethod<SguSoilDepthInfoResponse, SoilDepthInfo>(
    soilDepthWmsClient,
    SOIL_DEPTH_LAYERS,
    transformSoilDepthInfo,
  ),

  getGroundwaterAt: createPointQueryMethod<SguGroundwaterInfoResponse, GroundwaterInfo>(
    groundwaterWmsClient,
    GROUNDWATER_LAYERS,
    transformGroundwaterInfo,
  ),

  getLandslideAt: createPointQueryMethod<SguLandslideInfoResponse, LandslideInfo>(
    soilTypesWmsClient,
    LANDSLIDE_LAYERS,
    transformLandslideInfo,
    2000, // MinScaleDenominator requires ≥2km bbox
  ),

  getGroundwaterVulnerabilityAt: createPointQueryMethod<SguGroundwaterVulnerabilityInfoResponse, GroundwaterVulnerabilityInfo>(
    groundwaterWmsClient,
    GROUNDWATER_VULNERABILITY_LAYERS,
    transformGroundwaterVulnerabilityInfo,
  ),

  getRadonRiskAt: createPointQueryMethod<SguRadonRiskInfoResponse, RadonRiskInfo>(
    gammaWmsClient,
    RADON_RISK_LAYERS,
    transformRadonRiskInfo,
  ),

  getWellAt: createPointQueryMethod<SguWellPointInfoResponse, WellPointInfo>(
    wellsWmsClient,
    WELLS_LAYERS,
    transformWellPointInfo,
  ),
};
