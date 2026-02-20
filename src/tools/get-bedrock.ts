import { z } from 'zod';
import { sguClient } from '@/clients/sgu-client';
import { withErrorHandling } from '@/lib/response';
import { ValidationError } from '@/lib/errors';
import { BoundingBox, corridorToBoundingBox, validateBbox, CRS_SWEREF99TM } from '@/lib/geometry-utils';
import { wgs84BboxToSweref99, wgs84CoordinatesToSweref99, CRS_WGS84 } from '@/lib/coordinates';
import {
  minLatSchema,
  minLonSchema,
  maxLatSchema,
  maxLonSchema,
  coordinatesSchema,
  bufferMetersSchema,
  MapToolInput,
} from '@/types/common-schemas';

export const getBedrockInputSchema = {
  // Bbox mode parameters (flat, WGS84)
  minLat: minLatSchema,
  minLon: minLonSchema,
  maxLat: maxLatSchema,
  maxLon: maxLonSchema,
  // Corridor mode parameters (flat, WGS84)
  coordinates: coordinatesSchema,
  bufferMeters: bufferMetersSchema,
  // Bedrock-specific parameters
  limit: z.number().optional().describe('Max features to return (1-1000, default: 100)'),
};

export const getBedrockTool = {
  name: 'sgu_get_bedrock',
  description:
    'Get bedrock geology data for an area in Sweden. ' +
    'Returns information about rock types, geological units, lithology, and tectonic units. ' +
    'You must provide either bbox parameters (minLat, minLon, maxLat, maxLon) or corridor parameters (coordinates array). ' +
    'All coordinates must be in WGS84 (latitude/longitude). ' +
    'Useful for construction planning, tunnel projects, and infrastructure assessment.',
  inputSchema: getBedrockInputSchema,
};

type GetBedrockInput = MapToolInput & { limit?: number };

function hasBboxParams(args: MapToolInput): boolean {
  return args.minLat !== undefined && args.minLon !== undefined && args.maxLat !== undefined && args.maxLon !== undefined;
}

function hasCorridorParams(args: MapToolInput): boolean {
  return args.coordinates !== undefined && args.coordinates.length >= 2;
}

export const getBedrockHandler = withErrorHandling(async (args: GetBedrockInput) => {
  const hasBbox = hasBboxParams(args);
  const hasCorridor = hasCorridorParams(args);

  if (!hasBbox && !hasCorridor) {
    throw new ValidationError(
      'Either bbox (minLat, minLon, maxLat, maxLon) or corridor (coordinates array with [{latitude, longitude}, ...]) must be provided',
    );
  }

  let corridor: { coordinates: { x: number; y: number }[]; bufferMeters: number } | undefined;

  if (hasCorridor) {
    const sweref99Coords = wgs84CoordinatesToSweref99(args.coordinates!);
    corridor = {
      coordinates: sweref99Coords,
      bufferMeters: args.bufferMeters ?? 500,
    };
  }

  let bbox: BoundingBox;
  let queryType: 'bbox' | 'corridor';

  if (corridor) {
    bbox = corridorToBoundingBox(corridor);
    queryType = 'corridor';
  } else {
    bbox = wgs84BboxToSweref99({
      minLat: args.minLat!,
      minLon: args.minLon!,
      maxLat: args.maxLat!,
      maxLon: args.maxLon!,
    });
    queryType = 'bbox';
  }

  validateBbox(bbox);
  const result = await sguClient.getBedrock(bbox, args.limit ?? 100, corridor);

  return {
    query_type: queryType,
    input_coordinate_system: CRS_WGS84,
    internal_coordinate_system: CRS_SWEREF99TM,
    bbox_used: {
      minX: bbox.minX,
      minY: bbox.minY,
      maxX: bbox.maxX,
      maxY: bbox.maxY,
    },
    used_polygon_filter: result.usedPolygonFilter,
    count: result.features.length,
    features: result.features,
  };
});
