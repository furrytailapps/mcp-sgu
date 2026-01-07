import { z } from 'zod';

/**
 * Shared Zod schemas for map tools
 * All map tools (bedrock, soil types, boulder coverage, soil depth, groundwater, landslide)
 * use the same input parameters for map generation.
 */

export const bboxSchema = z
  .object({
    minX: z.number().describe('Minimum X coordinate (Easting in SWEREF99TM, EPSG:3006)'),
    minY: z.number().describe('Minimum Y coordinate (Northing in SWEREF99TM)'),
    maxX: z.number().describe('Maximum X coordinate (Easting in SWEREF99TM)'),
    maxY: z.number().describe('Maximum Y coordinate (Northing in SWEREF99TM)'),
  })
  .optional()
  .describe('Bounding box for the map extent in SWEREF99TM coordinates');

export const corridorSchema = z
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
  .describe('Corridor query for linear infrastructure (line with buffer)');

export const widthSchema = z
  .number()
  .int()
  .min(100)
  .max(4096)
  .default(800)
  .optional()
  .describe('Image width in pixels (default: 800)');

export const heightSchema = z
  .number()
  .int()
  .min(100)
  .max(4096)
  .default(600)
  .optional()
  .describe('Image height in pixels (default: 600)');

export const formatSchema = z.enum(['png', 'jpeg']).default('png').optional().describe('Image format (default: png)');

/**
 * Complete schema object for map tool inputs
 */
export const mapToolInputSchema = {
  bbox: bboxSchema,
  corridor: corridorSchema,
  width: widthSchema,
  height: heightSchema,
  format: formatSchema,
};

/**
 * TypeScript type for map tool inputs
 */
export type MapToolInput = {
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
