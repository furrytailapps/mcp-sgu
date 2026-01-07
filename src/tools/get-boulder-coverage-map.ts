import { sguClient } from '@/clients/sgu-client';
import { withErrorHandling } from '@/lib/response';
import { createMapToolHandler } from '@/lib/map-tool-handler';
import { mapToolInputSchema } from '@/types/common-schemas';

export const getBoulderCoverageMapInputSchema = mapToolInputSchema;

export const getBoulderCoverageMapTool = {
  name: 'sgu_get_boulder_coverage_map',
  description:
    'Get a rendered map image URL showing boulder coverage (blockighet) for an area in Sweden. ' +
    'Returns URLs for both the map image and a legend. ' +
    'Shows the density and distribution of boulders in the soil, which affects excavation difficulty. ' +
    'You must provide either a bounding box (bbox) or a corridor (line with buffer). ' +
    'All coordinates must be in SWEREF99TM (EPSG:3006). ' +
    'Critical for excavation planning, cable/pipe installation, and construction cost estimation.',
  inputSchema: getBoulderCoverageMapInputSchema,
};

export const getBoulderCoverageMapHandler = withErrorHandling(createMapToolHandler(sguClient.getBoulderCoverageMapUrl));
