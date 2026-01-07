import { sguClient } from '@/clients/sgu-client';
import { withErrorHandling } from '@/lib/response';
import { createMapToolHandler } from '@/lib/map-tool-handler';
import { mapToolInputSchema } from '@/types/common-schemas';

export const getSoilDepthMapInputSchema = mapToolInputSchema;

export const getSoilDepthMapTool = {
  name: 'sgu_get_soil_depth_map',
  description:
    'Get a rendered map image URL showing estimated soil depth (jorddjup) for an area in Sweden. ' +
    'Returns URLs for both the map image and a legend. ' +
    'Shows the estimated depth to bedrock, categorized in ranges (e.g., 0-1m, 1-3m, 3-10m, >10m). ' +
    'You must provide either a bounding box (bbox) or a corridor (line with buffer). ' +
    'All coordinates must be in SWEREF99TM (EPSG:3006). ' +
    'Essential for foundation design, basement planning, and underground construction.',
  inputSchema: getSoilDepthMapInputSchema,
};

export const getSoilDepthMapHandler = withErrorHandling(createMapToolHandler(sguClient.getSoilDepthMapUrl));
