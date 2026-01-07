import { ValidationError } from './errors';

/**
 * Coordinate Reference System for Swedish national grid
 */
export const CRS_SWEREF99TM = 'EPSG:3006';

/**
 * Bounding box in SWEREF99TM coordinates
 */
export interface BoundingBox {
  minX: number; // Easting (min)
  minY: number; // Northing (min)
  maxX: number; // Easting (max)
  maxY: number; // Northing (max)
}

/**
 * Point in SWEREF99TM coordinates
 */
export interface Point {
  x: number; // Easting
  y: number; // Northing
}

/**
 * Corridor definition (line with buffer)
 */
export interface Corridor {
  coordinates: { x: number; y: number }[]; // Array of coordinate objects
  bufferMeters: number;
}

/**
 * SWEREF99TM coordinate bounds for Sweden
 * These are approximate bounds for validation
 */
const SWEREF99TM_BOUNDS = {
  minX: 200000, // Western boundary
  maxX: 1000000, // Eastern boundary
  minY: 6100000, // Southern boundary
  maxY: 7700000, // Northern boundary
};

/**
 * Check if coordinates are within valid SWEREF99TM range for Sweden
 */
export function isValidSwedishCoordinate(x: number, y: number): boolean {
  return (
    x >= SWEREF99TM_BOUNDS.minX && x <= SWEREF99TM_BOUNDS.maxX && y >= SWEREF99TM_BOUNDS.minY && y <= SWEREF99TM_BOUNDS.maxY
  );
}

/**
 * Validate a bounding box
 */
export function validateBbox(bbox: BoundingBox): void {
  if (bbox.minX >= bbox.maxX) {
    throw new ValidationError('minX must be less than maxX', 'bbox');
  }
  if (bbox.minY >= bbox.maxY) {
    throw new ValidationError('minY must be less than maxY', 'bbox');
  }
  if (!isValidSwedishCoordinate(bbox.minX, bbox.minY)) {
    throw new ValidationError(`Coordinates (${bbox.minX}, ${bbox.minY}) are outside valid SWEREF99TM range for Sweden`, 'bbox');
  }
  if (!isValidSwedishCoordinate(bbox.maxX, bbox.maxY)) {
    throw new ValidationError(`Coordinates (${bbox.maxX}, ${bbox.maxY}) are outside valid SWEREF99TM range for Sweden`, 'bbox');
  }
}

/**
 * Validate a point
 */
export function validatePoint(point: Point): void {
  if (!isValidSwedishCoordinate(point.x, point.y)) {
    throw new ValidationError(`Coordinates (${point.x}, ${point.y}) are outside valid SWEREF99TM range for Sweden`, 'point');
  }
}

/**
 * Convert bounding box to WKT POLYGON format
 */
export function bboxToWkt(bbox: BoundingBox): string {
  const { minX, minY, maxX, maxY } = bbox;
  return `POLYGON((${minX} ${minY}, ${maxX} ${minY}, ${maxX} ${maxY}, ${minX} ${maxY}, ${minX} ${minY}))`;
}

/**
 * Convert bounding box to OGC bbox string format (minX,minY,maxX,maxY)
 */
export function bboxToString(bbox: BoundingBox): string {
  return `${bbox.minX},${bbox.minY},${bbox.maxX},${bbox.maxY}`;
}

/**
 * Convert corridor (line with buffer) to a bounding box
 * This is a simple approximation - adds buffer to the line's bbox
 */
export function corridorToBoundingBox(corridor: Corridor): BoundingBox {
  if (corridor.coordinates.length < 2) {
    throw new ValidationError('Corridor must have at least 2 coordinate pairs', 'corridor');
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const { x, y } of corridor.coordinates) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  // Add buffer to all sides
  const buffer = corridor.bufferMeters;
  return {
    minX: minX - buffer,
    minY: minY - buffer,
    maxX: maxX + buffer,
    maxY: maxY + buffer,
  };
}

/**
 * Convert corridor to a buffered WKT polygon
 * Creates an approximate polygon by offsetting the line on both sides
 */
export function corridorToWktPolygon(corridor: Corridor): string {
  if (corridor.coordinates.length < 2) {
    throw new ValidationError('Corridor must have at least 2 coordinate pairs', 'corridor');
  }

  const buffer = corridor.bufferMeters;
  const coords = corridor.coordinates;

  // Calculate offset points for left and right sides of the line
  const leftSide: { x: number; y: number }[] = [];
  const rightSide: { x: number; y: number }[] = [];

  for (let i = 0; i < coords.length; i++) {
    const { x, y } = coords[i];

    // Calculate perpendicular direction
    let dx: number, dy: number;

    if (i === 0) {
      // First point: use direction to next point
      dx = coords[1].x - x;
      dy = coords[1].y - y;
    } else if (i === coords.length - 1) {
      // Last point: use direction from previous point
      dx = x - coords[i - 1].x;
      dy = y - coords[i - 1].y;
    } else {
      // Middle points: average of incoming and outgoing directions
      const dx1 = x - coords[i - 1].x;
      const dy1 = y - coords[i - 1].y;
      const dx2 = coords[i + 1].x - x;
      const dy2 = coords[i + 1].y - y;
      dx = dx1 + dx2;
      dy = dy1 + dy2;
    }

    // Normalize and rotate 90 degrees for perpendicular
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) continue;

    const perpX = -dy / len;
    const perpY = dx / len;

    // Offset points
    leftSide.push({ x: x + perpX * buffer, y: y + perpY * buffer });
    rightSide.push({ x: x - perpX * buffer, y: y - perpY * buffer });
  }

  // Build polygon: left side forward, right side backward, close
  const polygonCoords = [...leftSide, ...rightSide.reverse(), leftSide[0]];

  const coordString = polygonCoords.map(({ x, y }) => `${x} ${y}`).join(', ');
  return `POLYGON((${coordString}))`;
}

/**
 * Calculate the width and height of a bbox in meters
 */
export function bboxDimensions(bbox: BoundingBox): { width: number; height: number } {
  return {
    width: bbox.maxX - bbox.minX,
    height: bbox.maxY - bbox.minY,
  };
}

/**
 * Get the center point of a bbox
 */
export function bboxCenter(bbox: BoundingBox): Point {
  return {
    x: (bbox.minX + bbox.maxX) / 2,
    y: (bbox.minY + bbox.maxY) / 2,
  };
}
