import { sguClient } from '@/clients/sgu-client';
import { withErrorHandling } from '@/lib/response';
import { createMapToolHandler } from '@/lib/map-tool-handler';
import { mapToolInputSchema } from '@/types/common-schemas';

export const getLandslideMapInputSchema = mapToolInputSchema;

export const getLandslideMapTool = {
  name: 'sgu_get_landslide_map',
  description:
    'Get a rendered map image URL showing historical landslide areas (jordskred) for an area in Sweden. ' +
    'Returns URLs for both the map image and a legend. ' +
    'Shows documented landslides in soil, critical for geotechnical risk assessment. ' +
    'You must provide either a bounding box (bbox) or a corridor (line with buffer). ' +
    'All coordinates must be in SWEREF99TM (EPSG:3006). ' +
    'Important for slope stability assessment and construction planning in hilly terrain.',
  inputSchema: getLandslideMapInputSchema,
};

export const getLandslideMapHandler = withErrorHandling(createMapToolHandler(sguClient.getLandslideMapUrl));
