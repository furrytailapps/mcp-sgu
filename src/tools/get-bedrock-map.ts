import { z } from 'zod';
import { sguClient } from '@/clients/sgu-client';
import { withErrorHandling } from '@/lib/response';
import { ValidationError } from '@/lib/errors';
import { BoundingBox, corridorToBoundingBox, validateBbox } from '@/lib/geometry-utils';

export const getBedrockMapInputSchema = {
  bbox: z
    .object({
      minX: z.number().describe('Minimum X coordinate (Easting in SWEREF99TM, EPSG:3006)'),
      minY: z.number().describe('Minimum Y coordinate (Northing in SWEREF99TM)'),
      maxX: z.number().describe('Maximum X coordinate (Easting in SWEREF99TM)'),
      maxY: z.number().describe('Maximum Y coordinate (Northing in SWEREF99TM)'),
    })
    .optional()
    .describe('Bounding box for the map extent in SWEREF99TM coordinates'),

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

  width: z.number().int().min(100).max(4096).default(800).optional().describe('Image width in pixels (default: 800)'),

  height: z.number().int().min(100).max(4096).default(600).optional().describe('Image height in pixels (default: 600)'),

  format: z.enum(['png', 'jpeg']).default('png').optional().describe('Image format (default: png)'),
};

export const getBedrockMapTool = {
  name: 'sgu_get_bedrock_map',
  description:
    'Get a rendered map image URL showing bedrock geology for an area in Sweden. ' +
    'Returns URLs for both the map image and a legend. ' +
    'You must provide either a bounding box (bbox) or a corridor (line with buffer). ' +
    'All coordinates must be in SWEREF99TM (EPSG:3006). ' +
    'The returned URLs can be opened directly in a browser or embedded in applications.',
  inputSchema: getBedrockMapInputSchema,
};

type GetBedrockMapInput = {
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
  width?: number;
  height?: number;
  format?: 'png' | 'jpeg';
};

export const getBedrockMapHandler = withErrorHandling(async (args: GetBedrockMapInput) => {
  // Validate: at least one geometry parameter must be provided
  if (!args.bbox && !args.corridor) {
    throw new ValidationError('Either bbox or corridor must be provided');
  }

  // Determine the bounding box to use
  let bbox: BoundingBox;

  if (args.corridor) {
    bbox = corridorToBoundingBox({
      coordinates: args.corridor.coordinates,
      bufferMeters: args.corridor.bufferMeters ?? 500,
    });
  } else {
    bbox = args.bbox as BoundingBox;
  }

  // Validate the bounding box
  validateBbox(bbox);

  // Get the map URLs
  const mapResponse = sguClient.getBedrockMapUrl(bbox, {
    width: args.width,
    height: args.height,
    format: args.format,
  });

  return mapResponse;
});
