import { z } from 'zod';

/**
 * Shared Zod schemas for map tools
 * All map tools use flat parameters for better OpenAI/LLM compatibility.
 *
 * Two modes:
 * 1. Bbox mode: Provide minX, minY, maxX, maxY
 * 2. Corridor mode: Provide coordinates array + optional bufferMeters
 */

// Bbox parameters (flat, not nested)
export const minXSchema = z
  .number()
  .optional()
  .describe('Minimum X coordinate (Easting in SWEREF99TM, EPSG:3006). Use with minY, maxX, maxY for bbox mode.');

export const minYSchema = z
  .number()
  .optional()
  .describe('Minimum Y coordinate (Northing in SWEREF99TM). Use with minX, maxX, maxY for bbox mode.');

export const maxXSchema = z
  .number()
  .optional()
  .describe('Maximum X coordinate (Easting in SWEREF99TM). Use with minX, minY, maxY for bbox mode.');

export const maxYSchema = z
  .number()
  .optional()
  .describe('Maximum Y coordinate (Northing in SWEREF99TM). Use with minX, minY, maxX for bbox mode.');

// Corridor parameters (flat)
export const coordinatesSchema = z
  .array(
    z.object({
      x: z.number(),
      y: z.number(),
    }),
  )
  .optional()
  .describe('Corridor centerline points [{x, y}, ...]. Requires 2+ points. Use with bufferMeters.');

export const bufferMetersSchema = z.number().optional().describe('Corridor buffer in meters (1-10000, default: 500)');

// Image parameters
export const widthSchema = z.number().optional().describe('Image width in pixels (100-4096, default: 800)');

export const heightSchema = z.number().optional().describe('Image height in pixels (100-4096, default: 600)');

export const formatSchema = z.enum(['png', 'jpeg']).optional().describe('Image format (default: png)');

/**
 * Complete schema object for map tool inputs (flat parameters)
 */
export const mapToolInputSchema = {
  // Bbox mode parameters
  minX: minXSchema,
  minY: minYSchema,
  maxX: maxXSchema,
  maxY: maxYSchema,
  // Corridor mode parameters
  coordinates: coordinatesSchema,
  bufferMeters: bufferMetersSchema,
  // Image parameters
  width: widthSchema,
  height: heightSchema,
  format: formatSchema,
};

/**
 * TypeScript type for map tool inputs (flat structure)
 */
export type MapToolInput = {
  // Bbox mode
  minX?: number;
  minY?: number;
  maxX?: number;
  maxY?: number;
  // Corridor mode
  coordinates?: { x: number; y: number }[];
  bufferMeters?: number;
  // Image options
  width?: number;
  height?: number;
  format?: 'png' | 'jpeg';
};
