import { sguClient } from '@/clients/sgu-client';
import { withErrorHandling } from '@/lib/response';
import { createMapToolHandler } from '@/lib/map-tool-handler';
import { mapToolInputSchema } from '@/types/common-schemas';

export const getWellsMapInputSchema = mapToolInputSchema;

export const getWellsMapTool = {
  name: 'sgu_get_wells_map',
  description:
    'Get a rendered map image URL showing groundwater wells (brunnar) for an area in Sweden. ' +
    'Returns URLs for both the map image and a legend. ' +
    'Shows locations of registered wells and boreholes from SGU archives. ' +
    'You must provide either a bounding box (bbox) or a corridor (line with buffer). ' +
    'All coordinates must be in SWEREF99TM (EPSG:3006). ' +
    'Useful for water supply planning, understanding local groundwater conditions, and avoiding conflicts with existing wells.',
  inputSchema: getWellsMapInputSchema,
};

export const getWellsMapHandler = withErrorHandling(createMapToolHandler(sguClient.getWellsMapUrl));
