import { z } from 'zod';
import { sguClient } from '@/clients/sgu-client';
import { withErrorHandling } from '@/lib/response';
import { ValidationError } from '@/lib/errors';
import { BoundingBox, corridorToBoundingBox, validateBbox, CRS_SWEREF99TM } from '@/lib/geometry-utils';
import { bboxSchema, corridorSchema, MapToolInput } from '@/types/common-schemas';

export const getBedrockInputSchema = {
  bbox: bboxSchema,
  corridor: corridorSchema,
  limit: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .default(100)
    .optional()
    .describe('Maximum number of features to return (1-1000, default: 100)'),
};

export const getBedrockTool = {
  name: 'sgu_get_bedrock',
  description:
    'Get bedrock geology data for an area in Sweden. ' +
    'Returns information about rock types, geological units, lithology, and tectonic units. ' +
    'You must provide either a bounding box (bbox) or a corridor (line with buffer). ' +
    'All coordinates must be in SWEREF99TM (EPSG:3006). ' +
    'Useful for construction planning, tunnel projects, and infrastructure assessment.',
  inputSchema: getBedrockInputSchema,
};

type GetBedrockInput = MapToolInput & { limit?: number };

export const getBedrockHandler = withErrorHandling(async (args: GetBedrockInput) => {
  // Validate: at least one geometry parameter must be provided
  if (!args.bbox && !args.corridor) {
    throw new ValidationError('Either bbox or corridor must be provided');
  }

  // Build corridor object if provided
  const corridor = args.corridor
    ? {
        coordinates: args.corridor.coordinates,
        bufferMeters: args.corridor.bufferMeters ?? 500,
      }
    : undefined;

  // Determine the bounding box to use (always needed as fallback)
  let bbox: BoundingBox;
  let queryType: 'bbox' | 'corridor';

  if (corridor) {
    bbox = corridorToBoundingBox(corridor);
    queryType = 'corridor';
  } else {
    bbox = args.bbox as BoundingBox;
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
