import { z } from 'zod';
import { sguClient } from '@/clients/sgu-client';
import { withErrorHandling } from '@/lib/response';
import { ValidationError } from '@/lib/errors';
import { BoundingBox, corridorToBoundingBox, validateBbox, CRS_SWEREF99TM } from '@/lib/geometry-utils';
import {
  minXSchema,
  minYSchema,
  maxXSchema,
  maxYSchema,
  coordinatesSchema,
  bufferMetersSchema,
  MapToolInput,
} from '@/types/common-schemas';

export const getBedrockInputSchema = {
  // Bbox mode parameters (flat)
  minX: minXSchema,
  minY: minYSchema,
  maxX: maxXSchema,
  maxY: maxYSchema,
  // Corridor mode parameters (flat)
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
    'You must provide either bbox parameters (minX, minY, maxX, maxY) or corridor parameters (coordinates array). ' +
    'All coordinates must be in SWEREF99TM (EPSG:3006). ' +
    'Useful for construction planning, tunnel projects, and infrastructure assessment.',
  inputSchema: getBedrockInputSchema,
};

type GetBedrockInput = MapToolInput & { limit?: number };

/**
 * Check if bbox parameters are provided (flat structure)
 */
function hasBboxParams(args: MapToolInput): boolean {
  return args.minX !== undefined && args.minY !== undefined && args.maxX !== undefined && args.maxY !== undefined;
}

/**
 * Check if corridor parameters are provided (flat structure)
 */
function hasCorridorParams(args: MapToolInput): boolean {
  return args.coordinates !== undefined && args.coordinates.length >= 2;
}

export const getBedrockHandler = withErrorHandling(async (args: GetBedrockInput) => {
  const hasBbox = hasBboxParams(args);
  const hasCorridor = hasCorridorParams(args);

  // Validate: at least one geometry parameter set must be provided
  if (!hasBbox && !hasCorridor) {
    throw new ValidationError('Either bbox (minX, minY, maxX, maxY) or corridor (coordinates array) must be provided');
  }

  // Build corridor object if provided
  const corridor = hasCorridor
    ? {
        coordinates: args.coordinates!,
        bufferMeters: args.bufferMeters ?? 500,
      }
    : undefined;

  // Determine the bounding box to use (always needed as fallback)
  let bbox: BoundingBox;
  let queryType: 'bbox' | 'corridor';

  if (corridor) {
    bbox = corridorToBoundingBox(corridor);
    queryType = 'corridor';
  } else {
    bbox = {
      minX: args.minX!,
      minY: args.minY!,
      maxX: args.maxX!,
      maxY: args.maxY!,
    };
    queryType = 'bbox';
  }

  // Validate the bounding box
  validateBbox(bbox);

  // Fetch bedrock data - pass corridor for polygon filtering when available
  const result = await sguClient.getBedrock(bbox, args.limit ?? 100, corridor);

  return {
    query_type: queryType,
    coordinate_system: CRS_SWEREF99TM,
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
