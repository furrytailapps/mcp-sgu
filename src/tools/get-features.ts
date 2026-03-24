import { withErrorHandling } from '@/lib/response';
import { ValidationError } from '@/lib/errors';
import { BoundingBox, Corridor, corridorToBoundingBox, validateBbox } from '@/lib/geometry-utils';
import { wgs84BboxToSweref99, wgs84CoordinatesToSweref99 } from '@/lib/coordinates';
import { queryFeatures } from '@/lib/feature-registry';
import {
  featureDataTypeSchema,
  geometryDetailSchema,
  limitSchema,
  minLatSchema,
  minLonSchema,
  maxLatSchema,
  maxLonSchema,
  coordinatesSchema,
  bufferMetersSchema,
  FeatureDataType,
  GeometryDetail,
} from '@/types/common-schemas';

export const getFeaturesInputSchema = {
  dataType: featureDataTypeSchema,
  minLat: minLatSchema,
  minLon: minLonSchema,
  maxLat: maxLatSchema,
  maxLon: maxLonSchema,
  coordinates: coordinatesSchema,
  bufferMeters: bufferMetersSchema,
  geometryDetail: geometryDetailSchema,
  limit: limitSchema,
};

export const getFeaturesTool = {
  name: 'sgu_get_features',
  description:
    'Get geological feature data for an area in Sweden. Returns GeoJSON features with properties. ' +
    'dataType options: bedrock (rock types and formations), soil_type (surface soil classification), ' +
    'groundwater_aquifers (aquifer boundaries/properties), wells (registered wells with depth/capacity), ' +
    'soil_layers (soil layer sequences with depth data). ' +
    'Provide bbox (minLat, minLon, maxLat, maxLon) OR corridor (coordinates + bufferMeters). ' +
    'All coordinates in WGS84 (latitude/longitude). ' +
    "Use geometryDetail to control token usage: 'none' for properties only, 'simplified' (default), 'full' for complete coordinates.",
  inputSchema: getFeaturesInputSchema,
};

type GetFeaturesInput = {
  dataType: FeatureDataType;
  minLat?: number;
  minLon?: number;
  maxLat?: number;
  maxLon?: number;
  coordinates?: { latitude: number; longitude: number }[];
  bufferMeters?: number;
  geometryDetail?: GeometryDetail;
  limit?: number;
};

export const getFeaturesHandler = withErrorHandling(async (args: GetFeaturesInput) => {
  const hasBbox =
    args.minLat !== undefined && args.minLon !== undefined && args.maxLat !== undefined && args.maxLon !== undefined;
  const hasCorridor = args.coordinates !== undefined && args.coordinates.length >= 2;

  if (!hasBbox && !hasCorridor) {
    throw new ValidationError(
      'Either bbox (minLat, minLon, maxLat, maxLon) or corridor (coordinates array with [{latitude, longitude}, ...]) must be provided',
    );
  }

  // Build corridor object if corridor params provided
  let corridor: Corridor | undefined;
  if (hasCorridor) {
    const sweref99Coords = wgs84CoordinatesToSweref99(args.coordinates!);
    corridor = { coordinates: sweref99Coords, bufferMeters: args.bufferMeters ?? 500 };
  }

  // Compute bbox
  let bbox: BoundingBox;
  let queryType: 'bbox' | 'corridor';
  if (corridor) {
    bbox = corridorToBoundingBox(corridor);
    queryType = 'corridor';
  } else {
    bbox = wgs84BboxToSweref99({ minLat: args.minLat!, minLon: args.minLon!, maxLat: args.maxLat!, maxLon: args.maxLon! });
    queryType = 'bbox';
  }

  validateBbox(bbox);

  const geometryDetail = args.geometryDetail ?? 'simplified';
  const limit = args.limit ?? 50;

  // Query via feature registry
  const result = await queryFeatures(args.dataType, bbox, limit, geometryDetail, corridor);

  return {
    data_type: args.dataType,
    query_type: queryType,
    coordinate_system: 'EPSG:3006',
    geometry_detail: geometryDetail,
    count: result.count,
    number_matched: result.numberMatched,
    features: result.features,
  };
});
