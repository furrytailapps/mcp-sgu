import { z } from 'zod';

/**
 * Shared Zod schemas for map tools
 * All map tools use flat parameters for better OpenAI/LLM compatibility.
 * Input coordinates are WGS84 (latitude/longitude), converted internally to SWEREF99TM.
 *
 * Two modes:
 * 1. Bbox mode: Provide minLat, minLon, maxLat, maxLon
 * 2. Corridor mode: Provide coordinates array + optional bufferMeters
 */

// Bbox parameters (flat, WGS84)
export const minLatSchema = z
  .number()
  .optional()
  .describe(
    'Minimum latitude (WGS84). Stockholm ~59.3, Gothenburg ~57.7, Malmo ~55.6. Use with minLon, maxLat, maxLon for bbox mode.',
  );

export const minLonSchema = z
  .number()
  .optional()
  .describe(
    'Minimum longitude (WGS84). Stockholm ~18.0, Gothenburg ~12.0, Malmo ~13.0. Use with minLat, maxLat, maxLon for bbox mode.',
  );

export const maxLatSchema = z
  .number()
  .optional()
  .describe('Maximum latitude (WGS84). Use with minLat, minLon, maxLon for bbox mode.');

export const maxLonSchema = z
  .number()
  .optional()
  .describe('Maximum longitude (WGS84). Use with minLat, minLon, maxLat for bbox mode.');

// Corridor parameters (flat, WGS84)
export const coordinatesSchema = z
  .array(
    z.object({
      latitude: z.number(),
      longitude: z.number(),
    }),
  )
  .optional()
  .describe('Corridor centerline points [{latitude, longitude}, ...]. Requires 2+ points. Use with bufferMeters.');

export const bufferMetersSchema = z.number().optional().describe('Corridor buffer in meters (1-10000, default: 500)');

// Image parameters
export const widthSchema = z.number().optional().describe('Image width in pixels (100-4096, default: 800)');

export const heightSchema = z.number().optional().describe('Image height in pixels (100-4096, default: 600)');

export const formatSchema = z.enum(['png', 'jpeg']).optional().describe('Image format (default: png)');

export const mapToolInputSchema = {
  // Bbox mode parameters (WGS84)
  minLat: minLatSchema,
  minLon: minLonSchema,
  maxLat: maxLatSchema,
  maxLon: maxLonSchema,
  // Corridor mode parameters (WGS84)
  coordinates: coordinatesSchema,
  bufferMeters: bufferMetersSchema,
  // Image parameters
  width: widthSchema,
  height: heightSchema,
  format: formatSchema,
};

export type MapToolInput = {
  // Bbox mode (WGS84)
  minLat?: number;
  minLon?: number;
  maxLat?: number;
  maxLon?: number;
  // Corridor mode (WGS84)
  coordinates?: { latitude: number; longitude: number }[];
  bufferMeters?: number;
  // Image options
  width?: number;
  height?: number;
  format?: 'png' | 'jpeg';
};

export const geometryDetailSchema = z
  .enum(['none', 'simplified', 'full'])
  .optional()
  .describe(
    "Geometry detail: 'none' (properties only), 'simplified' (default, reduced coordinates), 'full' (all coordinates)",
  );

export type GeometryDetail = 'none' | 'simplified' | 'full';

export const featureDataTypes = [
  'bedrock',
  'soil_type',
  'groundwater_aquifers',
  'wells',
  'soil_layers',
] as const;

export type FeatureDataType = (typeof featureDataTypes)[number];

export const featureDataTypeSchema = z
  .enum(featureDataTypes)
  .describe(
    'Data type: bedrock (rock types/formations), soil_type (surface soil classification), ' +
      'groundwater_aquifers (aquifer boundaries/properties), wells (registered wells with depth/capacity), ' +
      'soil_layers (soil layer sequences with depth data)',
  );

export const limitSchema = z.number().optional().describe('Max features to return (1-1000, default: 50)');

// ============================================================================
// Unified query schemas (sgu_query)
// ============================================================================

export const dataTypes = [
  'bedrock',
  'soil_type',
  'groundwater_aquifers',
  'wells',
  'soil_layers',
  'radon_risk',
  'soil_depth',
  'groundwater_vulnerability',
  'landslide',
] as const;

export type DataType = (typeof dataTypes)[number];

export const dataTypesSchema = z
  .union([z.array(z.enum(dataTypes)), z.literal('all')])
  .describe(
    'Data types to query. Array of: bedrock, soil_type, groundwater_aquifers, wells, soil_layers, ' +
      'radon_risk, soil_depth, groundwater_vulnerability, landslide. Or "all" for everything.',
  );

export const pointsSchema = z
  .array(z.object({ latitude: z.number(), longitude: z.number() }))
  .describe('Query points [{latitude, longitude}, ...]. One point = site assessment. Multiple = corridor sampling.');

export const radiusKmSchema = z
  .number()
  .optional()
  .describe('Search radius in km around the points (default: 0.2). Controls bbox size for area queries.');

export interface MapOptions {
  width?: number;
  height?: number;
  format?: 'png' | 'jpeg';
}

export interface MapResponse {
  map_url: string;
  legend_url: string;
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
  coordinate_system: string;
  layers: string[];
}
