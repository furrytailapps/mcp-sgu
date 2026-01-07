import { sguClient } from '@/clients/sgu-client';
import { withErrorHandling } from '@/lib/response';
import { createMapToolHandler } from '@/lib/map-tool-handler';
import { mapToolInputSchema } from '@/types/common-schemas';

export const getSoilTypesMapInputSchema = mapToolInputSchema;

export const getSoilTypesMapTool = {
  name: 'sgu_get_soil_types_map',
  description:
    'Get a rendered map image URL showing soil types (jordarter) for an area in Sweden. ' +
    'Returns URLs for both the map image and a legend. ' +
    'Shows quaternary deposits including clay, sand, gravel, moraine, peat, and exposed bedrock. ' +
    'You must provide either a bounding box (bbox) or a corridor (line with buffer). ' +
    'All coordinates must be in SWEREF99TM (EPSG:3006). ' +
    'Useful for ground conditions assessment, foundation planning, and excavation planning.',
  inputSchema: getSoilTypesMapInputSchema,
};

export const getSoilTypesMapHandler = withErrorHandling(createMapToolHandler(sguClient.getSoilTypesMapUrl));
