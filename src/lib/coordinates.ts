import proj4 from 'proj4';
import { ValidationError } from './errors';

/**
 * Coordinate Reference Systems
 */
export const CRS_SWEREF99TM = 'EPSG:3006';
export const CRS_WGS84 = 'EPSG:4326';

/**
 * Define SWEREF99 TM projection for proj4
 * Official definition from Lantmäteriet
 */
proj4.defs('EPSG:3006', '+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs');

/**
 * Point in SWEREF99TM coordinates
 */
export interface Sweref99Point {
  x: number; // Easting
  y: number; // Northing
}

/**
 * Point in WGS84 coordinates
 */
export interface Wgs84Point {
  latitude: number;
  longitude: number;
}

/**
 * Bounding box in SWEREF99TM coordinates (internal format)
 */
export interface Sweref99Bbox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Bounding box in WGS84 coordinates (input format)
 */
export interface Wgs84Bbox {
  minLat: number;
  minLon: number;
  maxLat: number;
  maxLon: number;
}

/**
 * WGS84 coordinate bounds for Sweden
 */
const WGS84_BOUNDS = {
  minLat: 55.0,
  maxLat: 69.0,
  minLon: 11.0,
  maxLon: 24.0,
};

/**
 * Check if coordinates are within valid WGS84 range for Sweden
 */
export function isValidWgs84Coordinate(latitude: number, longitude: number): boolean {
  return (
    latitude >= WGS84_BOUNDS.minLat &&
    latitude <= WGS84_BOUNDS.maxLat &&
    longitude >= WGS84_BOUNDS.minLon &&
    longitude <= WGS84_BOUNDS.maxLon
  );
}

/**
 * Convert WGS84 coordinates to SWEREF99TM
 */
export function wgs84ToSweref99(point: Wgs84Point): Sweref99Point {
  if (!isValidWgs84Coordinate(point.latitude, point.longitude)) {
    throw new ValidationError(
      `WGS84 coordinates (${point.latitude}, ${point.longitude}) are outside valid range for Sweden (55-69°N, 11-24°E)`,
      'coordinates',
    );
  }

  // proj4 uses [x, y] = [longitude, latitude] order for WGS84
  const result = proj4('EPSG:4326', 'EPSG:3006', [point.longitude, point.latitude]);

  return {
    x: result[0],
    y: result[1],
  };
}

/**
 * Convert WGS84 bounding box to SWEREF99TM
 */
export function wgs84BboxToSweref99(bbox: Wgs84Bbox): Sweref99Bbox {
  // Validate all corners
  if (!isValidWgs84Coordinate(bbox.minLat, bbox.minLon)) {
    throw new ValidationError(
      `WGS84 coordinates (${bbox.minLat}, ${bbox.minLon}) are outside valid range for Sweden (55-69°N, 11-24°E)`,
      'bbox',
    );
  }
  if (!isValidWgs84Coordinate(bbox.maxLat, bbox.maxLon)) {
    throw new ValidationError(
      `WGS84 coordinates (${bbox.maxLat}, ${bbox.maxLon}) are outside valid range for Sweden (55-69°N, 11-24°E)`,
      'bbox',
    );
  }
  if (bbox.minLat >= bbox.maxLat) {
    throw new ValidationError('minLat must be less than maxLat', 'bbox');
  }
  if (bbox.minLon >= bbox.maxLon) {
    throw new ValidationError('minLon must be less than maxLon', 'bbox');
  }

  // Convert corners
  const minCorner = wgs84ToSweref99({ latitude: bbox.minLat, longitude: bbox.minLon });
  const maxCorner = wgs84ToSweref99({ latitude: bbox.maxLat, longitude: bbox.maxLon });

  return {
    minX: minCorner.x,
    minY: minCorner.y,
    maxX: maxCorner.x,
    maxY: maxCorner.y,
  };
}

/**
 * Convert array of WGS84 coordinates (corridor) to SWEREF99TM
 */
export function wgs84CoordinatesToSweref99(coords: Wgs84Point[]): Sweref99Point[] {
  if (coords.length < 2) {
    throw new ValidationError('Corridor must have at least 2 coordinate points', 'coordinates');
  }

  return coords.map((coord) => wgs84ToSweref99(coord));
}
