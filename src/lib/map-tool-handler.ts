import { ValidationError } from '@/lib/errors';
import { BoundingBox, corridorToBoundingBox, validateBbox } from '@/lib/geometry-utils';
import { MapToolInput } from '@/types/common-schemas';
import { MapResponse } from '@/types/sgu-api';

/**
 * Check if bbox parameters are provided (flat structure)
 */
function hasBboxParams(args: MapToolInput): boolean {
  return args.minX !== undefined && args.minY !== undefined && args.maxX !== undefined && args.maxY !== undefined;
}

/**
 * Check if corridor parameters are provided (flat structure)
 */
function hasCorridorParams(args: MapToolInput): boolean {
  return args.coordinates !== undefined && args.coordinates.length >= 2;
}

/**
 * Common handler logic for map tools
 * Validates input, determines bbox from either bbox params or corridor params, and validates the bbox
 */
export function processMapToolInput(args: MapToolInput): BoundingBox {
  const hasBbox = hasBboxParams(args);
  const hasCorridor = hasCorridorParams(args);

  // Validate: at least one geometry parameter set must be provided
  if (!hasBbox && !hasCorridor) {
    throw new ValidationError('Either bbox (minX, minY, maxX, maxY) or corridor (coordinates array) must be provided');
  }

  // Determine the bounding box to use
  let bbox: BoundingBox;

  if (hasCorridor) {
    bbox = corridorToBoundingBox({
      coordinates: args.coordinates!,
      bufferMeters: args.bufferMeters ?? 500,
    });
  } else {
    bbox = {
      minX: args.minX!,
      minY: args.minY!,
      maxX: args.maxX!,
      maxY: args.maxY!,
    };
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
