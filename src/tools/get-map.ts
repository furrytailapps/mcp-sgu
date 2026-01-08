import { z } from 'zod';
import { sguClient } from '@/clients/sgu-client';
import { withErrorHandling } from '@/lib/response';
import { processMapToolInput } from '@/lib/map-tool-handler';
import { BoundingBox } from '@/lib/geometry-utils';
import { MapResponse, MapOptions } from '@/types/sgu-api';

/**
 * Available map layers
 */
const MAP_LAYERS = [
  'bedrock',
  'soil_types',
  'boulder_coverage',
  'soil_depth',
  'groundwater',
  'groundwater_vulnerability',
  'landslide',
  'radon_risk',
  'wells',
  'gravel_deposits',
  'rock_deposits',
] as const;

type MapLayer = (typeof MAP_LAYERS)[number];

export const getMapInputSchema = {
  layer: z
    .enum(MAP_LAYERS)
    .describe(
      'Map layer: ' +
        'bedrock (geology), ' +
        'soil_types (surface materials), ' +
        'boulder_coverage (blockiness), ' +
        'soil_depth (depth to rock), ' +
        'groundwater (aquifers), ' +
        'groundwater_vulnerability (contamination risk), ' +
        'landslide (historical slides), ' +
        'radon_risk (gamma/uranium), ' +
        'wells (boreholes), ' +
        'gravel_deposits, ' +
        'rock_deposits (construction materials)',
    ),
  // Bbox mode parameters
  minX: z.number().optional().describe('Bbox min X (SWEREF99TM). Stockholm ~670000'),
  minY: z.number().optional().describe('Bbox min Y. Stockholm ~6575000'),
  maxX: z.number().optional().describe('Bbox max X'),
  maxY: z.number().optional().describe('Bbox max Y'),
  // Corridor mode parameters
  coordinates: z
    .array(z.object({ x: z.number(), y: z.number() }))
    .optional()
    .describe('Corridor centerline [{x,y},...]. Alternative to bbox.'),
  bufferMeters: z.number().optional().describe('Corridor buffer in meters (default: 500)'),
  // Image parameters
  width: z.number().optional().describe('Image width px (default: 800)'),
  height: z.number().optional().describe('Image height px (default: 600)'),
  format: z.enum(['png', 'jpeg']).optional().describe('Image format (default: png)'),
};

export const getMapTool = {
  name: 'sgu_get_map',
  description:
    'Generate a geological map image URL for an area in Sweden. ' +
    'Provide bbox (minX, minY, maxX, maxY) OR corridor (coordinates + bufferMeters). ' +
    'Coordinates in SWEREF99TM (EPSG:3006). ' +
    'Returns map image URL and legend URL.',
  inputSchema: getMapInputSchema,
};

type GetMapInput = {
  layer: MapLayer;
  minX?: number;
  minY?: number;
  maxX?: number;
  maxY?: number;
  coordinates?: { x: number; y: number }[];
  bufferMeters?: number;
  width?: number;
  height?: number;
  format?: 'png' | 'jpeg';
};

/**
 * Map layer names to their client methods
 */
const MAP_METHODS: Record<MapLayer, (bbox: BoundingBox, options: MapOptions) => MapResponse> = {
  bedrock: sguClient.getBedrockMapUrl,
  soil_types: sguClient.getSoilTypesMapUrl,
  boulder_coverage: sguClient.getBoulderCoverageMapUrl,
  soil_depth: sguClient.getSoilDepthMapUrl,
  groundwater: sguClient.getGroundwaterMapUrl,
  groundwater_vulnerability: sguClient.getGroundwaterVulnerabilityMapUrl,
  landslide: sguClient.getLandslideMapUrl,
  radon_risk: sguClient.getRadonRiskMapUrl,
  wells: sguClient.getWellsMapUrl,
  gravel_deposits: sguClient.getGravelDepositsMapUrl,
  rock_deposits: sguClient.getRockDepositsMapUrl,
};

export const getMapHandler = withErrorHandling(async (args: GetMapInput) => {
  // Process input to get bounding box (handles both bbox and corridor modes)
  const bbox = processMapToolInput(args);

  // Get the appropriate map method
  const getMapUrl = MAP_METHODS[args.layer];

  // Generate map URLs
  const mapResponse = getMapUrl(bbox, {
    width: args.width,
    height: args.height,
    format: args.format,
  });

  return {
    layer: args.layer,
    ...mapResponse,
  };
});
