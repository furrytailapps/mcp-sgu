import { createOgcClient } from '@/lib/ogc-client';
import { createWmsClient } from '@/lib/wms-client';
import { BoundingBox, Point, bboxCenter, bboxDimensions } from '@/lib/geometry-utils';
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

// ============================================================================
// Default layers for WMS (INSPIRE-style layer names)
// ============================================================================

const BEDROCK_LAYERS = ['SE.GOV.SGU.BERG.GEOLOGISK_ENHET.YTA.50K'];
const SOIL_TYPES_LAYERS = ['SE.GOV.SGU.JORD.GRUNDLAGER.25K'];

// ============================================================================
// SGU Client API
// ============================================================================

export const sguClient = {
  /**
   * Get bedrock features within a bounding box
   * Uses the 'geologisk-enhet-yta' collection (geological unit areas)
   */
  async getBedrock(bbox: BoundingBox, limit: number = 100): Promise<BedrockFeature[]> {
    const features = await bedrockOgcClient.getItems<SguBedrockFeature>('geologisk-enhet-yta', {
      bbox,
      limit,
    });
    return features.map(transformBedrockFeature);
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

    const legendUrl = bedrockWmsClient.getLegendUrl(BEDROCK_LAYERS[0]);

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
      layers: BEDROCK_LAYERS,
    };
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

    const legendUrl = soilTypesWmsClient.getLegendUrl(SOIL_TYPES_LAYERS[0]);

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
      layers: SOIL_TYPES_LAYERS,
    };
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
};
