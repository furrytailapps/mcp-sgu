import { z } from 'zod';
import { sguClient } from '@/clients/sgu-client';
import { withErrorHandling } from '@/lib/response';
import { ValidationError } from '@/lib/errors';
import { BoundingBox, corridorToBoundingBox, validateBbox } from '@/lib/geometry-utils';
import { wgs84BboxToSweref99, wgs84CoordinatesToSweref99 } from '@/lib/coordinates';
import {
  minLatSchema,
  minLonSchema,
  maxLatSchema,
  maxLonSchema,
  coordinatesSchema,
  bufferMetersSchema,
  widthSchema,
  heightSchema,
  formatSchema,
  MapResponse,
  MapOptions,
} from '@/types/common-schemas';

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
  minLat: minLatSchema,
  minLon: minLonSchema,
  maxLat: maxLatSchema,
  maxLon: maxLonSchema,
  coordinates: coordinatesSchema,
  bufferMeters: bufferMetersSchema,
  width: widthSchema,
  height: heightSchema,
  format: formatSchema,
};

export const getMapTool = {
  name: 'sgu_get_map',
  description:
    'Generate a geological map image URL for an area in Sweden. ' +
    'Provide bbox (minLat, minLon, maxLat, maxLon) OR corridor (coordinates + bufferMeters). ' +
    'Point queries supported: set minLat=maxLat, minLon=maxLon. ' +
    'A 200m buffer is always added around bbox edges (adjustable via bufferMeters; corridor default: 500m). ' +
    'Coordinates in WGS84 (latitude/longitude). ' +
    'Example bbox: minLat=57.7, minLon=12.0, maxLat=57.8, maxLon=12.1. ' +
    'Layers: bedrock, soil_types, boulder_coverage, soil_depth, groundwater, ' +
    'groundwater_vulnerability, landslide, radon_risk, wells, gravel_deposits, rock_deposits. ' +
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

function processMapInput(args: GetMapInput): BoundingBox {
  const hasBbox =
    args.minLat !== undefined && args.minLon !== undefined && args.maxLat !== undefined && args.maxLon !== undefined;
  const hasCorridor = args.coordinates !== undefined && args.coordinates.length >= 2;

  if (!hasBbox && !hasCorridor) {
    throw new ValidationError(
      'Either bbox (minLat, minLon, maxLat, maxLon) or corridor (coordinates array with [{latitude, longitude}, ...]) must be provided',
    );
  }

  if (hasCorridor) {
    const sweref99Coords = wgs84CoordinatesToSweref99(args.coordinates!);
    const bbox = corridorToBoundingBox({ coordinates: sweref99Coords, bufferMeters: args.bufferMeters ?? 500 });
    validateBbox(bbox);
    return bbox;
  }

  const bbox = wgs84BboxToSweref99(
    { minLat: args.minLat!, minLon: args.minLon!, maxLat: args.maxLat!, maxLon: args.maxLon! },
    args.bufferMeters,
  );
  validateBbox(bbox);
  return bbox;
}

export const getMapHandler = withErrorHandling(async (args: GetMapInput) => {
  const bbox = processMapInput(args);
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
