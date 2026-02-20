import { z } from 'zod';
import { sguClient } from '@/clients/sgu-client';
import { withErrorHandling } from '@/lib/response';
import { wgs84ToSweref99, CRS_WGS84 } from '@/lib/coordinates';

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
  latitude: z.number().describe('Latitude (WGS84). Stockholm ~59.33, Gothenburg ~57.71, Malmo ~55.61'),
  longitude: z.number().describe('Longitude (WGS84). Stockholm ~18.07, Gothenburg ~11.97, Malmo ~13.00'),
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
    'Coordinates in WGS84 (latitude/longitude). ' +
    'Essential for site-specific construction and infrastructure planning.',
  inputSchema: queryPointInputSchema,
};

type QueryPointInput = {
  latitude: number;
  longitude: number;
  dataType: DataType;
};

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
  const sweref99Point = wgs84ToSweref99({ latitude: args.latitude, longitude: args.longitude });
  const config = QUERY_CONFIG[args.dataType];
  const data = await config.method(sweref99Point);

  return {
    coordinate_system: CRS_WGS84,
    coordinates: { latitude: args.latitude, longitude: args.longitude },
    data_type: args.dataType,
    found: data !== null,
    [config.key]: data,
  };
});
