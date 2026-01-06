import { z } from 'zod';
import { sguClient } from '@/clients/sgu-client';
import { withErrorHandling } from '@/lib/response';
import { ValidationError } from '@/lib/errors';
import { BoundingBox, corridorToBoundingBox, validateBbox, CRS_SWEREF99TM } from '@/lib/geometry-utils';

export const getBedrockInputSchema = {
  bbox: z
    .object({
      minX: z.number().describe('Minimum X coordinate (Easting in SWEREF99TM, EPSG:3006)'),
      minY: z.number().describe('Minimum Y coordinate (Northing in SWEREF99TM)'),
      maxX: z.number().describe('Maximum X coordinate (Easting in SWEREF99TM)'),
      maxY: z.number().describe('Maximum Y coordinate (Northing in SWEREF99TM)'),
    })
    .optional()
    .describe('Bounding box for area query in SWEREF99TM coordinates'),

  corridor: z
    .object({
      coordinates: z
        .array(z.tuple([z.number(), z.number()]))
        .min(2)
        .describe('Array of [easting, northing] coordinate pairs defining the centerline'),
      bufferMeters: z
        .number()
        .min(1)
        .max(10000)
        .default(500)
        .describe('Buffer distance in meters on each side of the line (default: 500m)'),
    })
    .optional()
    .describe('Corridor query for linear infrastructure (line with buffer)'),

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

type GetBedrockInput = {
  bbox?: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  corridor?: {
    coordinates: [number, number][];
    bufferMeters: number;
  };
  limit?: number;
};

export const getBedrockHandler = withErrorHandling(async (args: GetBedrockInput) => {
  // Validate: at least one geometry parameter must be provided
  if (!args.bbox && !args.corridor) {
    throw new ValidationError('Either bbox or corridor must be provided');
  }

  // Determine the bounding box to use
  let bbox: BoundingBox;
  let queryType: 'bbox' | 'corridor';

  if (args.corridor) {
    bbox = corridorToBoundingBox({
      coordinates: args.corridor.coordinates,
      bufferMeters: args.corridor.bufferMeters ?? 500,
    });
    queryType = 'corridor';
  } else {
    bbox = args.bbox as BoundingBox;
    queryType = 'bbox';
  }

  // Validate the bounding box
  validateBbox(bbox);

  // Fetch bedrock data
  const features = await sguClient.getBedrock(bbox, args.limit ?? 100);

  return {
    query_type: queryType,
    coordinate_system: CRS_SWEREF99TM,
    bbox_used: {
      minX: bbox.minX,
      minY: bbox.minY,
      maxX: bbox.maxX,
      maxY: bbox.maxY,
    },
    count: features.length,
    features,
  };
});
