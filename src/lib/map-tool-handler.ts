import { ValidationError } from '@/lib/errors';
import { BoundingBox, corridorToBoundingBox, validateBbox } from '@/lib/geometry-utils';
import { wgs84BboxToSweref99, wgs84CoordinatesToSweref99 } from '@/lib/coordinates';
import { MapToolInput } from '@/types/common-schemas';
import { MapResponse } from '@/types/sgu-api';

function hasBboxParams(args: MapToolInput): boolean {
  return args.minLat !== undefined && args.minLon !== undefined && args.maxLat !== undefined && args.maxLon !== undefined;
}

function hasCorridorParams(args: MapToolInput): boolean {
  return args.coordinates !== undefined && args.coordinates.length >= 2;
}

// Input is WGS84, converted internally to SWEREF99TM for upstream APIs
export function processMapToolInput(args: MapToolInput): BoundingBox {
  const hasBbox = hasBboxParams(args);
  const hasCorridor = hasCorridorParams(args);

  if (!hasBbox && !hasCorridor) {
    throw new ValidationError(
      'Either bbox (minLat, minLon, maxLat, maxLon) or corridor (coordinates array with [{latitude, longitude}, ...]) must be provided',
    );
  }

  let bbox: BoundingBox;

  if (hasCorridor) {
    const sweref99Coords = wgs84CoordinatesToSweref99(args.coordinates!);
    bbox = corridorToBoundingBox({
      coordinates: sweref99Coords,
      bufferMeters: args.bufferMeters ?? 500,
    });
  } else {
    const sweref99Bbox = wgs84BboxToSweref99({
      minLat: args.minLat!,
      minLon: args.minLon!,
      maxLat: args.maxLat!,
      maxLon: args.maxLon!,
    });
    bbox = sweref99Bbox;
  }

  validateBbox(bbox);

  return bbox;
}

export function createMapToolHandler(
  getMapUrl: (bbox: BoundingBox, options: { width?: number; height?: number; format?: 'png' | 'jpeg' }) => MapResponse,
) {
  return async (args: MapToolInput): Promise<MapResponse> => {
    const bbox = processMapToolInput(args);

    const mapResponse = getMapUrl(bbox, {
      width: args.width,
      height: args.height,
      format: args.format,
    });

    return mapResponse;
  };
}
