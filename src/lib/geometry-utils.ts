import { ValidationError } from './errors';

export const CRS_SWEREF99TM = 'EPSG:3006';

export interface BoundingBox {
  minX: number; // Easting (min)
  minY: number; // Northing (min)
  maxX: number; // Easting (max)
  maxY: number; // Northing (max)
}

export interface Point {
  x: number; // Easting
  y: number; // Northing
}

export interface Corridor {
  coordinates: { x: number; y: number }[]; // Array of coordinate objects
  bufferMeters: number;
}

// Approximate SWEREF99TM bounds for Sweden
const SWEREF99TM_BOUNDS = {
  minX: 200000, // Western boundary
  maxX: 1000000, // Eastern boundary
  minY: 6100000, // Southern boundary
  maxY: 7700000, // Northern boundary
};

export function isValidSwedishCoordinate(x: number, y: number): boolean {
  return (
    x >= SWEREF99TM_BOUNDS.minX && x <= SWEREF99TM_BOUNDS.maxX && y >= SWEREF99TM_BOUNDS.minY && y <= SWEREF99TM_BOUNDS.maxY
  );
}

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

export function validatePoint(point: Point): void {
  if (!isValidSwedishCoordinate(point.x, point.y)) {
    throw new ValidationError(`Coordinates (${point.x}, ${point.y}) are outside valid SWEREF99TM range for Sweden`, 'point');
  }
}

export function bboxToWkt(bbox: BoundingBox): string {
  const { minX, minY, maxX, maxY } = bbox;
  return `POLYGON((${minX} ${minY}, ${maxX} ${minY}, ${maxX} ${maxY}, ${minX} ${maxY}, ${minX} ${minY}))`;
}

// OGC bbox string format: minX,minY,maxX,maxY
export function bboxToString(bbox: BoundingBox): string {
  return `${bbox.minX},${bbox.minY},${bbox.maxX},${bbox.maxY}`;
}

// Simple approximation: adds buffer to the line's bbox
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

// Creates an approximate polygon by offsetting the line on both sides
export function corridorToWktPolygon(corridor: Corridor): string {
  if (corridor.coordinates.length < 2) {
    throw new ValidationError('Corridor must have at least 2 coordinate pairs', 'corridor');
  }

  const buffer = corridor.bufferMeters;
  const coords = corridor.coordinates;

  const leftSide: { x: number; y: number }[] = [];
  const rightSide: { x: number; y: number }[] = [];

  for (let i = 0; i < coords.length; i++) {
    const { x, y } = coords[i];

    let dx: number, dy: number;

    if (i === 0) {
      dx = coords[1].x - x;
      dy = coords[1].y - y;
    } else if (i === coords.length - 1) {
      dx = x - coords[i - 1].x;
      dy = y - coords[i - 1].y;
    } else {
      // Average of incoming and outgoing directions
      const dx1 = x - coords[i - 1].x;
      const dy1 = y - coords[i - 1].y;
      const dx2 = coords[i + 1].x - x;
      const dy2 = coords[i + 1].y - y;
      dx = dx1 + dx2;
      dy = dy1 + dy2;
    }

    // Rotate 90 degrees for perpendicular offset
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) continue;

    const perpX = -dy / len;
    const perpY = dx / len;

    leftSide.push({ x: x + perpX * buffer, y: y + perpY * buffer });
    rightSide.push({ x: x - perpX * buffer, y: y - perpY * buffer });
  }

  const polygonCoords = [...leftSide, ...rightSide.reverse(), leftSide[0]];

  const coordString = polygonCoords.map(({ x, y }) => `${x} ${y}`).join(', ');
  return `POLYGON((${coordString}))`;
}

export function bboxDimensions(bbox: BoundingBox): { width: number; height: number } {
  return {
    width: bbox.maxX - bbox.minX,
    height: bbox.maxY - bbox.minY,
  };
}

export function bboxCenter(bbox: BoundingBox): Point {
  return {
    x: (bbox.minX + bbox.maxX) / 2,
    y: (bbox.minY + bbox.maxY) / 2,
  };
}
