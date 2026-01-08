import { z } from 'zod';
import { sguClient } from '@/clients/sgu-client';
import { withErrorHandling } from '@/lib/response';
import { validatePoint, CRS_SWEREF99TM } from '@/lib/geometry-utils';

export const getSoilDepthAtPointInputSchema = {
  x: z.number().describe('X coordinate (Easting in SWEREF99TM, EPSG:3006)'),
  y: z.number().describe('Y coordinate (Northing in SWEREF99TM, EPSG:3006)'),
};

export const getSoilDepthAtPointTool = {
  name: 'sgu_get_soil_depth_at_point',
  description:
    'Get estimated soil depth (jorddjup) to bedrock at a specific coordinate in Sweden. ' +
    'Returns depth class and description indicating how deep the soil layer is before reaching bedrock. ' +
    'Coordinates must be in SWEREF99TM (EPSG:3006). ' +
    'Useful for excavation planning and foundation design.',
  inputSchema: getSoilDepthAtPointInputSchema,
};

type GetSoilDepthAtPointInput = {
  x: number;
  y: number;
};

export const getSoilDepthAtPointHandler = withErrorHandling(async (args: GetSoilDepthAtPointInput) => {
  const point = { x: args.x, y: args.y };

  // Validate the point coordinates
  validatePoint(point);

  // Get soil depth information
  const soilDepth = await sguClient.getSoilDepthAt(point);

  return {
    coordinate_system: CRS_SWEREF99TM,
    coordinates: {
      x: args.x,
      y: args.y,
    },
    found: soilDepth !== null,
    soil_depth: soilDepth,
  };
});
