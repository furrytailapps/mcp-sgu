import { z } from 'zod';
import { sguClient } from '@/clients/sgu-client';
import { withErrorHandling } from '@/lib/response';
import { validatePoint, CRS_SWEREF99TM } from '@/lib/geometry-utils';

export const getRadonRiskAtPointInputSchema = {
  x: z.number().describe('X coordinate (Easting in SWEREF99TM, EPSG:3006)'),
  y: z.number().describe('Y coordinate (Northing in SWEREF99TM, EPSG:3006)'),
};

export const getRadonRiskAtPointTool = {
  name: 'sgu_get_radon_risk_at_point',
  description:
    'Get radon risk information at a specific coordinate in Sweden. ' +
    'Returns gamma radiation (uranium) measurement as a proxy for radon risk, with risk level classification. ' +
    'Coordinates must be in SWEREF99TM (EPSG:3006). ' +
    'Useful for building permits, indoor air quality assessment, and ventilation system design.',
  inputSchema: getRadonRiskAtPointInputSchema,
};

type GetRadonRiskAtPointInput = {
  x: number;
  y: number;
};

export const getRadonRiskAtPointHandler = withErrorHandling(async (args: GetRadonRiskAtPointInput) => {
  const point = { x: args.x, y: args.y };

  // Validate the point coordinates
  validatePoint(point);

  // Get radon risk information
  const radonRisk = await sguClient.getRadonRiskAt(point);

  return {
    coordinate_system: CRS_SWEREF99TM,
    coordinates: {
      x: args.x,
      y: args.y,
    },
    found: radonRisk !== null,
    radon_risk: radonRisk,
  };
});
