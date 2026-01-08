import { sguClient } from '@/clients/sgu-client';
import { withErrorHandling } from '@/lib/response';
import { createMapToolHandler } from '@/lib/map-tool-handler';
import { mapToolInputSchema } from '@/types/common-schemas';

export const getGravelDepositsMapInputSchema = mapToolInputSchema;

export const getGravelDepositsMapTool = {
  name: 'sgu_get_gravel_deposits_map',
  description:
    'Get a rendered map image URL showing gravel and sand deposits (grusförekomster) for an area in Sweden. ' +
    'Returns URLs for both the map image and a legend. ' +
    'Shows locations of sand and gravel deposits suitable for construction materials (ballast). ' +
    'You must provide either a bounding box (bbox) or a corridor (line with buffer). ' +
    'All coordinates must be in SWEREF99TM (EPSG:3006). ' +
    'Essential for sourcing aggregates for road construction, concrete production, and infrastructure projects.',
  inputSchema: getGravelDepositsMapInputSchema,
};

export const getGravelDepositsMapHandler = withErrorHandling(createMapToolHandler(sguClient.getGravelDepositsMapUrl));
