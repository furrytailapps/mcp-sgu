import { sguClient } from '@/clients/sgu-client';
import { withErrorHandling } from '@/lib/response';
import { createMapToolHandler } from '@/lib/map-tool-handler';
import { mapToolInputSchema, MapToolInput } from '@/types/common-schemas';

export const getBedrockMapInputSchema = mapToolInputSchema;

export const getBedrockMapTool = {
  name: 'sgu_get_bedrock_map',
  description:
    'Get a rendered map image URL showing bedrock geology for an area in Sweden. ' +
    'Returns URLs for both the map image and a legend. ' +
    'You must provide either a bounding box (bbox) or a corridor (line with buffer). ' +
    'All coordinates must be in SWEREF99TM (EPSG:3006). ' +
    'The returned URLs can be opened directly in a browser or embedded in applications.',
  inputSchema: getBedrockMapInputSchema,
};

export const getBedrockMapHandler = withErrorHandling(createMapToolHandler(sguClient.getBedrockMapUrl));
