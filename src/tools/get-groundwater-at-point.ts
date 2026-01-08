import { z } from 'zod';
import { sguClient } from '@/clients/sgu-client';
import { withErrorHandling } from '@/lib/response';
import { validatePoint, CRS_SWEREF99TM } from '@/lib/geometry-utils';

export const getGroundwaterAtPointInputSchema = {
  x: z.number().describe('X coordinate (Easting in SWEREF99TM, EPSG:3006)'),
  y: z.number().describe('Y coordinate (Northing in SWEREF99TM, EPSG:3006)'),
};

export const getGroundwaterAtPointTool = {
  name: 'sgu_get_groundwater_at_point',
  description:
    'Get groundwater aquifer (grundvattenmagasin) information at a specific coordinate in Sweden. ' +
    'Returns aquifer type, soil layer, and capacity if the point is within a mapped groundwater reservoir. ' +
    'Coordinates must be in SWEREF99TM (EPSG:3006). ' +
    'Useful for water supply planning and understanding groundwater availability.',
  inputSchema: getGroundwaterAtPointInputSchema,
};

type GetGroundwaterAtPointInput = {
  x: number;
  y: number;
};

export const getGroundwaterAtPointHandler = withErrorHandling(async (args: GetGroundwaterAtPointInput) => {
  const point = { x: args.x, y: args.y };

  // Validate the point coordinates
  validatePoint(point);

  // Get groundwater information
  const groundwater = await sguClient.getGroundwaterAt(point);

  return {
    coordinate_system: CRS_SWEREF99TM,
    coordinates: {
      x: args.x,
      y: args.y,
    },
    found: groundwater !== null,
    groundwater,
  };
});
