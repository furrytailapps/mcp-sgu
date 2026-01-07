import { sguClient } from '@/clients/sgu-client';
import { withErrorHandling } from '@/lib/response';
import { createMapToolHandler } from '@/lib/map-tool-handler';
import { mapToolInputSchema } from '@/types/common-schemas';

export const getRadonRiskMapInputSchema = mapToolInputSchema;

export const getRadonRiskMapTool = {
  name: 'sgu_get_radon_risk_map',
  description:
    'Get a rendered map image URL showing radon risk levels for an area in Sweden. ' +
    'Returns URLs for both the map image and a legend. ' +
    'Uses gamma radiation (uranium) measurements as a proxy for radon risk - higher uranium levels indicate higher radon potential. ' +
    'You must provide either a bounding box (bbox) or a corridor (line with buffer). ' +
    'All coordinates must be in SWEREF99TM (EPSG:3006). ' +
    'Critical for building planning and indoor air quality assessment.',
  inputSchema: getRadonRiskMapInputSchema,
};

export const getRadonRiskMapHandler = withErrorHandling(createMapToolHandler(sguClient.getRadonRiskMapUrl));
