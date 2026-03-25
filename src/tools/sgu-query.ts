import { withErrorHandling } from '@/lib/response';
import { wgs84ToSweref99, sweref99BboxToWgs84, validateWgs84Bbox, isValidWgs84Coordinate } from '@/lib/coordinates';
import { ValidationError } from '@/lib/errors';
import { queryAll } from '@/lib/data-registry';
import {
  dataTypes,
  dataTypesSchema,
  pointsSchema,
  radiusKmSchema,
  geometryDetailSchema,
  limitSchema,
} from '@/types/common-schemas';
import type { DataType, GeometryDetail } from '@/types/common-schemas';
import type { BoundingBox, Point } from '@/lib/geometry-utils';

export const sguQueryInputSchema = {
  dataTypes: dataTypesSchema,
  points: pointsSchema,
  radiusKm: radiusKmSchema,
  geometryDetail: geometryDetailSchema,
  limit: limitSchema,
};

export const sguQueryTool = {
  name: 'sgu_query',
  description:
    'Query geological data at one or more points in Sweden. ' +
    'Returns area features (bedrock, soil, wells, aquifers, soil layers) and point measurements ' +
    '(radon, soil depth, groundwater vulnerability, landslide). ' +
    'One point = site assessment. Multiple points = corridor sampling (e.g. along a railway track). ' +
    'Use "all" for dataTypes to get everything, or specify which types you need.',
  inputSchema: sguQueryInputSchema,
};

type SguQueryInput = {
  dataTypes: DataType[] | 'all';
  points: { latitude: number; longitude: number }[];
  radiusKm?: number;
  geometryDetail?: GeometryDetail;
  limit?: number;
};

export const sguQueryHandler = withErrorHandling(async (args: SguQueryInput) => {
  if (!args.points || args.points.length === 0) {
    throw new ValidationError('At least one point is required', 'points');
  }
  for (const p of args.points) {
    if (!isValidWgs84Coordinate(p.latitude, p.longitude)) {
      throw new ValidationError(
        `Point (${p.latitude}, ${p.longitude}) is outside Sweden (55-69°N, 11-24°E)`,
        'points',
      );
    }
  }

  const requestedTypes: DataType[] = args.dataTypes === 'all' ? [...dataTypes] : args.dataTypes;
  const radiusKm = args.radiusKm ?? 0.2;
  const geometryDetail = args.geometryDetail ?? 'simplified';
  const limit = args.limit ?? 50;

  // Convert points to SWEREF99TM (for WMS queries and bbox computation)
  const sweref99Points: Point[] = args.points.map((p) => {
    const s = wgs84ToSweref99(p);
    return { x: s.x, y: s.y };
  });

  // Compute bbox: SWEREF99TM min/max + radius → convert back to WGS84
  const radiusM = radiusKm * 1000;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of sweref99Points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const sweref99Bbox = {
    minX: minX - radiusM,
    minY: minY - radiusM,
    maxX: maxX + radiusM,
    maxY: maxY + radiusM,
  };
  const wgs84Bbox = sweref99BboxToWgs84(sweref99Bbox);
  try {
    validateWgs84Bbox(wgs84Bbox);
  } catch {
    throw new ValidationError(
      `The ${radiusKm}km radius extends outside Sweden's bounds. Reduce radiusKm or pick a point further from the border.`,
      'radiusKm',
    );
  }

  // BoundingBox for OGC: WGS84 (minX=minLon, minY=minLat)
  const ogcBbox: BoundingBox = {
    minX: wgs84Bbox.minLon,
    minY: wgs84Bbox.minLat,
    maxX: wgs84Bbox.maxLon,
    maxY: wgs84Bbox.maxLat,
  };

  const { results, errors } = await queryAll(requestedTypes, ogcBbox, sweref99Points, limit, geometryDetail);

  const response: Record<string, unknown> = {
    query: {
      points: args.points,
      radiusKm,
      bbox: wgs84Bbox,
    },
    ...results,
  };
  if (Object.keys(errors).length > 0) {
    response.errors = errors;
  }
  return response;
});
