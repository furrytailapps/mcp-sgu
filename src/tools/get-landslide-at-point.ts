import { z } from 'zod';
import { sguClient } from '@/clients/sgu-client';
import { withErrorHandling } from '@/lib/response';
import { validatePoint, CRS_SWEREF99TM } from '@/lib/geometry-utils';

export const getLandslideAtPointInputSchema = {
  x: z.number().describe('X coordinate (Easting in SWEREF99TM, EPSG:3006)'),
  y: z.number().describe('Y coordinate (Northing in SWEREF99TM, EPSG:3006)'),
};

export const getLandslideAtPointTool = {
  name: 'sgu_get_landslide_at_point',
  description:
    'Get historical landslide (skred) information at a specific coordinate in Sweden. ' +
    'Returns landslide type and date if the point is within a mapped historical landslide area. ' +
    'Coordinates must be in SWEREF99TM (EPSG:3006). ' +
    'Useful for geotechnical risk assessment and site investigations.',
  inputSchema: getLandslideAtPointInputSchema,
};

type GetLandslideAtPointInput = {
  x: number;
  y: number;
};

export const getLandslideAtPointHandler = withErrorHandling(async (args: GetLandslideAtPointInput) => {
  const point = { x: args.x, y: args.y };

  // Validate the point coordinates
  validatePoint(point);

  // Get landslide information
  const landslide = await sguClient.getLandslideAt(point);

  return {
    coordinate_system: CRS_SWEREF99TM,
    coordinates: {
      x: args.x,
      y: args.y,
    },
    found: landslide !== null,
    landslide,
  };
});
