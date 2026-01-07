import { sguClient } from '@/clients/sgu-client';
import { withErrorHandling } from '@/lib/response';
import { createMapToolHandler } from '@/lib/map-tool-handler';
import { mapToolInputSchema } from '@/types/common-schemas';

export const getGroundwaterMapInputSchema = mapToolInputSchema;

export const getGroundwaterMapTool = {
  name: 'sgu_get_groundwater_map',
  description:
    'Get a rendered map image URL showing groundwater aquifers (grundvattenmagasin) for an area in Sweden. ' +
    'Returns URLs for both the map image and a legend. ' +
    'Shows groundwater reservoirs in soil layers, important for water supply planning and construction dewatering assessment. ' +
    'You must provide either a bounding box (bbox) or a corridor (line with buffer). ' +
    'All coordinates must be in SWEREF99TM (EPSG:3006). ' +
    'Essential for infrastructure projects near groundwater resources.',
  inputSchema: getGroundwaterMapInputSchema,
};

export const getGroundwaterMapHandler = withErrorHandling(createMapToolHandler(sguClient.getGroundwaterMapUrl));
