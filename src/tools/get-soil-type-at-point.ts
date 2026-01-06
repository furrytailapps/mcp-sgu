import { z } from 'zod';
import { sguClient } from '@/clients/sgu-client';
import { withErrorHandling } from '@/lib/response';
import { validatePoint, CRS_SWEREF99TM } from '@/lib/geometry-utils';

export const getSoilTypeAtPointInputSchema = {
  x: z.number().describe('X coordinate (Easting in SWEREF99TM, EPSG:3006)'),
  y: z.number().describe('Y coordinate (Northing in SWEREF99TM, EPSG:3006)'),
};

export const getSoilTypeAtPointTool = {
  name: 'sgu_get_soil_type_at_point',
  description:
    'Get soil type information at a specific coordinate in Sweden. ' +
    'Returns information about the surface soil layer, underlying layers, landform, and boulder coverage. ' +
    'Coordinates must be in SWEREF99TM (EPSG:3006). ' +
    'Useful for site-specific ground condition assessment at a particular location.',
  inputSchema: getSoilTypeAtPointInputSchema,
};

type GetSoilTypeAtPointInput = {
  x: number;
  y: number;
};

export const getSoilTypeAtPointHandler = withErrorHandling(async (args: GetSoilTypeAtPointInput) => {
  const point = { x: args.x, y: args.y };

  // Validate the point coordinates
  validatePoint(point);

  // Get soil type information
  const soilType = await sguClient.getSoilTypeAt(point);

  return {
    coordinate_system: CRS_SWEREF99TM,
    coordinates: {
      x: args.x,
      y: args.y,
    },
    found: soilType !== null,
    soil_type: soilType,
  };
});
