import { withErrorHandling } from '@/lib/response';
import { BoundingBox, Corridor, corridorToBoundingBox } from '@/lib/geometry-utils';
import { wgs84CoordinatesToSweref99, sweref99BboxToWgs84, validateWgs84Bbox } from '@/lib/coordinates';
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
    throw new Error(
      'Either bbox (minLat, minLon, maxLat, maxLon) or corridor (coordinates array with [{latitude, longitude}, ...]) must be provided',
    );
  }

  // Build corridor object and derive WGS84 bbox from corridor envelope
  let corridor: Corridor | undefined;
  let bbox: BoundingBox;
  let queryType: 'bbox' | 'corridor';

  if (hasCorridor) {
    // Corridor buffer math requires meters — convert to SWEREF99TM
    const sweref99Coords = wgs84CoordinatesToSweref99(args.coordinates!);
    corridor = { coordinates: sweref99Coords, bufferMeters: args.bufferMeters ?? 500 };
    // Convert the SWEREF99TM bbox back to WGS84 for the OGC query
    const sweref99Bbox = corridorToBoundingBox(corridor);
    const wgs84Bbox = sweref99BboxToWgs84(sweref99Bbox);
    // BoundingBox is CRS-agnostic: minX=minLon, minY=minLat
    bbox = { minX: wgs84Bbox.minLon, minY: wgs84Bbox.minLat, maxX: wgs84Bbox.maxLon, maxY: wgs84Bbox.maxLat };
    queryType = 'corridor';
  } else {
    // Bbox mode: use WGS84 input directly — no conversion needed
    validateWgs84Bbox({ minLat: args.minLat!, minLon: args.minLon!, maxLat: args.maxLat!, maxLon: args.maxLon! });
    bbox = { minX: args.minLon!, minY: args.minLat!, maxX: args.maxLon!, maxY: args.maxLat! };
    queryType = 'bbox';
  }

  const geometryDetail = args.geometryDetail ?? 'simplified';
  const limit = args.limit ?? 50;

  // Query via feature registry (bbox is WGS84: minX=minLon, minY=minLat)
  const result = await queryFeatures(args.dataType, bbox, limit, geometryDetail, corridor);

  return {
    data_type: args.dataType,
    query_type: queryType,
    coordinate_system: 'WGS84',
    geometry_detail: geometryDetail,
    count: result.count,
    number_matched: result.numberMatched,
    features: result.features,
  };
});
