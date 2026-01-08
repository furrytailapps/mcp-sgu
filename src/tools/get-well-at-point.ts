import { z } from 'zod';
import { sguClient } from '@/clients/sgu-client';
import { withErrorHandling } from '@/lib/response';
import { validatePoint, CRS_SWEREF99TM } from '@/lib/geometry-utils';

export const getWellAtPointInputSchema = {
  x: z.number().describe('X coordinate (Easting in SWEREF99TM, EPSG:3006)'),
  y: z.number().describe('Y coordinate (Northing in SWEREF99TM, EPSG:3006)'),
};

export const getWellAtPointTool = {
  name: 'sgu_get_well_at_point',
  description:
    'Get well/borehole information at a specific coordinate in Sweden. ' +
    'Returns well ID, total depth, soil depth, water capacity, groundwater level, and usage type if a well exists at the location. ' +
    'Coordinates must be in SWEREF99TM (EPSG:3006). ' +
    'Useful for site investigation, avoiding conflicts with existing wells, and understanding local groundwater conditions.',
  inputSchema: getWellAtPointInputSchema,
};

type GetWellAtPointInput = {
  x: number;
  y: number;
};

export const getWellAtPointHandler = withErrorHandling(async (args: GetWellAtPointInput) => {
  const point = { x: args.x, y: args.y };

  // Validate the point coordinates
  validatePoint(point);

  // Get well information
  const well = await sguClient.getWellAt(point);

  return {
    coordinate_system: CRS_SWEREF99TM,
    coordinates: {
      x: args.x,
      y: args.y,
    },
    found: well !== null,
    well,
  };
});
