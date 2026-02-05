import { ValidationError } from '@/lib/errors';
import { BoundingBox, corridorToBoundingBox, validateBbox } from '@/lib/geometry-utils';
import { wgs84BboxToSweref99, wgs84CoordinatesToSweref99 } from '@/lib/coordinates';
import { MapToolInput } from '@/types/common-schemas';
import { MapResponse } from '@/types/sgu-api';

/**
 * Check if bbox parameters are provided (flat structure, WGS84)
 */
function hasBboxParams(args: MapToolInput): boolean {
  return args.minLat !== undefined && args.minLon !== undefined && args.maxLat !== undefined && args.maxLon !== undefined;
}

/**
 * Check if corridor parameters are provided (flat structure, WGS84)
 */
function hasCorridorParams(args: MapToolInput): boolean {
  return args.coordinates !== undefined && args.coordinates.length >= 2;
}

/**
 * Common handler logic for map tools
 * Validates input, determines bbox from either bbox params or corridor params, and validates the bbox
 * Input is WGS84, converted internally to SWEREF99TM for upstream APIs
 */
export function processMapToolInput(args: MapToolInput): BoundingBox {
  const hasBbox = hasBboxParams(args);
  const hasCorridor = hasCorridorParams(args);

  // Validate: at least one geometry parameter set must be provided
  if (!hasBbox && !hasCorridor) {
    throw new ValidationError(
      'Either bbox (minLat, minLon, maxLat, maxLon) or corridor (coordinates array with [{latitude, longitude}, ...]) must be provided',
    );
  }

  // Determine the bounding box to use
  let bbox: BoundingBox;

  if (hasCorridor) {
    // Convert WGS84 coordinates to SWEREF99TM
    const sweref99Coords = wgs84CoordinatesToSweref99(args.coordinates!);
    bbox = corridorToBoundingBox({
      coordinates: sweref99Coords,
      bufferMeters: args.bufferMeters ?? 500,
    });
  } else {
    // Convert WGS84 bbox to SWEREF99TM
    const sweref99Bbox = wgs84BboxToSweref99({
      minLat: args.minLat!,
      minLon: args.minLon!,
      maxLat: args.maxLat!,
      maxLon: args.maxLon!,
    });
    bbox = sweref99Bbox;
  }

  // Validate the bounding box (SWEREF99TM validation)
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
