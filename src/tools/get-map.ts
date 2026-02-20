import { z } from 'zod';
import { sguClient } from '@/clients/sgu-client';
import { withErrorHandling } from '@/lib/response';
import { processMapToolInput } from '@/lib/map-tool-handler';
import { BoundingBox } from '@/lib/geometry-utils';
import { MapResponse, MapOptions } from '@/types/sgu-api';

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
  // Bbox mode parameters (WGS84)
  minLat: z.number().optional().describe('Bbox min latitude (WGS84). Stockholm ~59.3'),
  minLon: z.number().optional().describe('Bbox min longitude (WGS84). Stockholm ~18.0'),
  maxLat: z.number().optional().describe('Bbox max latitude (WGS84)'),
  maxLon: z.number().optional().describe('Bbox max longitude (WGS84)'),
  // Corridor mode parameters (WGS84)
  coordinates: z
    .array(z.object({ latitude: z.number(), longitude: z.number() }))
    .optional()
    .describe('Corridor centerline [{latitude, longitude},...]. Alternative to bbox.'),
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
    'Provide bbox (minLat, minLon, maxLat, maxLon) OR corridor (coordinates + bufferMeters). ' +
    'Coordinates in WGS84 (latitude/longitude). ' +
    'Returns map image URL and legend URL.',
  inputSchema: getMapInputSchema,
};

type GetMapInput = {
  layer: MapLayer;
  minLat?: number;
  minLon?: number;
  maxLat?: number;
  maxLon?: number;
  coordinates?: { latitude: number; longitude: number }[];
  bufferMeters?: number;
  width?: number;
  height?: number;
  format?: 'png' | 'jpeg';
};

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
  const bbox = processMapToolInput(args);
  const getMapUrl = MAP_METHODS[args.layer];
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
