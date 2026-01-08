import { z } from 'zod';
import { sguClient } from '@/clients/sgu-client';
import { withErrorHandling } from '@/lib/response';
import { validatePoint, CRS_SWEREF99TM } from '@/lib/geometry-utils';

export const getBedrockAtPointInputSchema = {
  x: z.number().describe('X coordinate (Easting in SWEREF99TM, EPSG:3006)'),
  y: z.number().describe('Y coordinate (Northing in SWEREF99TM, EPSG:3006)'),
};

export const getBedrockAtPointTool = {
  name: 'sgu_get_bedrock_at_point',
  description:
    'Get bedrock (berggrund) information at a specific coordinate in Sweden. ' +
    'Returns rock type, geological unit, lithology, tectonic unit, and age. ' +
    'Coordinates must be in SWEREF99TM (EPSG:3006). ' +
    'Useful for foundation planning and understanding subsurface rock conditions at a specific location.',
  inputSchema: getBedrockAtPointInputSchema,
};

type GetBedrockAtPointInput = {
  x: number;
  y: number;
};

export const getBedrockAtPointHandler = withErrorHandling(async (args: GetBedrockAtPointInput) => {
  const point = { x: args.x, y: args.y };

  // Validate the point coordinates
  validatePoint(point);

  // Get bedrock information
  const bedrock = await sguClient.getBedrockAt(point);

  return {
    coordinate_system: CRS_SWEREF99TM,
    coordinates: {
      x: args.x,
      y: args.y,
    },
    found: bedrock !== null,
    bedrock,
  };
});
