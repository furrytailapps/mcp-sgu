import { ValidationError } from '@/lib/errors';
import { BoundingBox, corridorToBoundingBox, validateBbox } from '@/lib/geometry-utils';
import { MapToolInput } from '@/types/common-schemas';
import { MapResponse } from '@/types/sgu-api';

/**
 * Common handler logic for map tools
 * Validates input, determines bbox from either bbox or corridor, and validates the bbox
 */
export function processMapToolInput(args: MapToolInput): BoundingBox {
  // Validate: at least one geometry parameter must be provided
  if (!args.bbox && !args.corridor) {
    throw new ValidationError('Either bbox or corridor must be provided');
  }

  // Determine the bounding box to use
  let bbox: BoundingBox;

  if (args.corridor) {
    bbox = corridorToBoundingBox({
      coordinates: args.corridor.coordinates,
      bufferMeters: args.corridor.bufferMeters ?? 500,
    });
  } else {
    bbox = args.bbox as BoundingBox;
  }

  // Validate the bounding box
  validateBbox(bbox);

  return bbox;
}

/**
 * Generic map tool handler factory
 * Creates a handler function for a specific map type
 */
export function createMapToolHandler(
  getMapUrl: (bbox: BoundingBox, options: { width?: number; height?: number; format?: 'png' | 'jpeg' }) => MapResponse,
) {
  return async (args: MapToolInput): Promise<MapResponse> => {
    const bbox = processMapToolInput(args);

    // Get the map URLs
    const mapResponse = getMapUrl(bbox, {
      width: args.width,
      height: args.height,
      format: args.format,
    });

    return mapResponse;
  };
}
