import { z } from 'zod';
import { sguClient } from '@/clients/sgu-client';
import { withErrorHandling } from '@/lib/response';
import { validatePoint, CRS_SWEREF99TM } from '@/lib/geometry-utils';

/**
 * Data types available for point queries
 */
const DATA_TYPES = [
  'bedrock',
  'soil_type',
  'boulder_coverage',
  'soil_depth',
  'groundwater',
  'groundwater_vulnerability',
  'landslide',
  'radon_risk',
  'well',
] as const;

type DataType = (typeof DATA_TYPES)[number];

export const queryPointInputSchema = {
  x: z.number().describe('X coordinate (Easting in SWEREF99TM). Stockholm ~674000, Gothenburg ~319000, Malmo ~374000'),
  y: z.number().describe('Y coordinate (Northing in SWEREF99TM). Stockholm ~6580000, Gothenburg ~6400000, Malmo ~6164000'),
  dataType: z
    .enum(DATA_TYPES)
    .describe(
      'Data type: ' +
        'bedrock (rock type/age), ' +
        'soil_type (surface layers), ' +
        'boulder_coverage (blockiness), ' +
        'soil_depth (depth to bedrock), ' +
        'groundwater (aquifer), ' +
        'groundwater_vulnerability (contamination risk), ' +
        'landslide (historical), ' +
        'radon_risk (gamma/uranium), ' +
        'well (borehole data)',
    ),
};

export const queryPointTool = {
  name: 'sgu_query_point',
  description:
    'Query geological data at a specific coordinate in Sweden. ' +
    'Returns detailed information based on dataType. ' +
    'Coordinates in SWEREF99TM (EPSG:3006). ' +
    'Essential for site-specific construction and infrastructure planning.',
  inputSchema: queryPointInputSchema,
};

type QueryPointInput = {
  x: number;
  y: number;
  dataType: DataType;
};

/**
 * Map data types to their client methods and response property names
 */
const QUERY_CONFIG: Record<DataType, { method: (point: { x: number; y: number }) => Promise<unknown>; key: string }> = {
  bedrock: { method: sguClient.getBedrockAt, key: 'bedrock' },
  soil_type: { method: sguClient.getSoilTypeAt, key: 'soil_type' },
  boulder_coverage: { method: sguClient.getBoulderCoverageAt, key: 'boulder_coverage' },
  soil_depth: { method: sguClient.getSoilDepthAt, key: 'soil_depth' },
  groundwater: { method: sguClient.getGroundwaterAt, key: 'groundwater' },
  groundwater_vulnerability: { method: sguClient.getGroundwaterVulnerabilityAt, key: 'groundwater_vulnerability' },
  landslide: { method: sguClient.getLandslideAt, key: 'landslide' },
  radon_risk: { method: sguClient.getRadonRiskAt, key: 'radon_risk' },
  well: { method: sguClient.getWellAt, key: 'well' },
};

export const queryPointHandler = withErrorHandling(async (args: QueryPointInput) => {
  const point = { x: args.x, y: args.y };

  // Validate the point coordinates
  validatePoint(point);

  // Get the appropriate query method and response key
  const config = QUERY_CONFIG[args.dataType];
  const data = await config.method(point);

  return {
    coordinate_system: CRS_SWEREF99TM,
    coordinates: { x: args.x, y: args.y },
    data_type: args.dataType,
    found: data !== null,
    [config.key]: data,
  };
});
