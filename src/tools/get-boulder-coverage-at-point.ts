import { z } from 'zod';
import { sguClient } from '@/clients/sgu-client';
import { withErrorHandling } from '@/lib/response';
import { validatePoint, CRS_SWEREF99TM } from '@/lib/geometry-utils';

export const getBoulderCoverageAtPointInputSchema = {
  x: z.number().describe('X coordinate (Easting in SWEREF99TM, EPSG:3006)'),
  y: z.number().describe('Y coordinate (Northing in SWEREF99TM, EPSG:3006)'),
};

export const getBoulderCoverageAtPointTool = {
  name: 'sgu_get_boulder_coverage_at_point',
  description:
    'Get boulder coverage (blockighet) information at a specific coordinate in Sweden. ' +
    'Returns the density class of boulders and rocks on the surface. ' +
    'Coordinates must be in SWEREF99TM (EPSG:3006). ' +
    'Useful for assessing excavation difficulty and terrain conditions.',
  inputSchema: getBoulderCoverageAtPointInputSchema,
};

type GetBoulderCoverageAtPointInput = {
  x: number;
  y: number;
};

export const getBoulderCoverageAtPointHandler = withErrorHandling(async (args: GetBoulderCoverageAtPointInput) => {
  const point = { x: args.x, y: args.y };

  // Validate the point coordinates
  validatePoint(point);

  // Get boulder coverage information
  const boulderCoverage = await sguClient.getBoulderCoverageAt(point);

  return {
    coordinate_system: CRS_SWEREF99TM,
    coordinates: {
      x: args.x,
      y: args.y,
    },
    found: boulderCoverage !== null,
    boulder_coverage: boulderCoverage,
  };
});
