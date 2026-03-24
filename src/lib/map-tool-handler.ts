import { ValidationError } from '@/lib/errors';
import { BoundingBox, corridorToBoundingBox, validateBbox } from '@/lib/geometry-utils';
import { wgs84BboxToSweref99, wgs84CoordinatesToSweref99 } from '@/lib/coordinates';
import { MapToolInput } from '@/types/common-schemas';

export function processMapToolInput(args: MapToolInput): BoundingBox {
  const hasBbox =
    args.minLat !== undefined && args.minLon !== undefined && args.maxLat !== undefined && args.maxLon !== undefined;
  const hasCorridor = args.coordinates !== undefined && args.coordinates.length >= 2;

  if (!hasBbox && !hasCorridor) {
    throw new ValidationError(
      'Either bbox (minLat, minLon, maxLat, maxLon) or corridor (coordinates array with [{latitude, longitude}, ...]) must be provided',
    );
  }

  if (hasCorridor) {
    const sweref99Coords = wgs84CoordinatesToSweref99(args.coordinates!);
    const bbox = corridorToBoundingBox({
      coordinates: sweref99Coords,
      bufferMeters: args.bufferMeters ?? 500,
    });
    validateBbox(bbox);
    return bbox;
  }

  const bbox = wgs84BboxToSweref99({
    minLat: args.minLat!,
    minLon: args.minLon!,
    maxLat: args.maxLat!,
    maxLon: args.maxLon!,
  });
  validateBbox(bbox);
  return bbox;
}
