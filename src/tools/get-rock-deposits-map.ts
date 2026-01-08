import { sguClient } from '@/clients/sgu-client';
import { withErrorHandling } from '@/lib/response';
import { createMapToolHandler } from '@/lib/map-tool-handler';
import { mapToolInputSchema } from '@/types/common-schemas';

export const getRockDepositsMapInputSchema = mapToolInputSchema;

export const getRockDepositsMapTool = {
  name: 'sgu_get_rock_deposits_map',
  description:
    'Get a rendered map image URL showing rock deposits (bergförekomster) for an area in Sweden. ' +
    'Returns URLs for both the map image and a legend. ' +
    'Shows locations of rock occurrences suitable for construction materials (ballast), quarrying, and aggregate production. ' +
    'You must provide either a bounding box (bbox) or a corridor (line with buffer). ' +
    'All coordinates must be in SWEREF99TM (EPSG:3006). ' +
    'Essential for sourcing crushed rock for road construction, railway ballast, and concrete aggregates.',
  inputSchema: getRockDepositsMapInputSchema,
};

export const getRockDepositsMapHandler = withErrorHandling(createMapToolHandler(sguClient.getRockDepositsMapUrl));
