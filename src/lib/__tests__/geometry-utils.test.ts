import { describe, it, expect } from 'vitest';
import {
  isValidSwedishCoordinate,
  validateBbox,
  validatePoint,
  bboxToWkt,
  bboxToString,
  corridorToBoundingBox,
  corridorToWktPolygon,
  bboxDimensions,
  bboxCenter,
  CRS_SWEREF99TM,
  type BoundingBox,
  type Corridor,
} from '../geometry-utils';
import { ValidationError } from '../errors';

describe('geometry-utils', () => {
  describe('CRS_SWEREF99TM', () => {
    it('should be EPSG:3006', () => {
      expect(CRS_SWEREF99TM).toBe('EPSG:3006');
    });
  });

  describe('isValidSwedishCoordinate', () => {
    it('should return true for valid Stockholm coordinates', () => {
      // Stockholm area: approximately 674000, 6580000
      expect(isValidSwedishCoordinate(674000, 6580000)).toBe(true);
    });

    it('should return true for valid Malmö coordinates', () => {
      // Malmö area: approximately 370000, 6160000
      expect(isValidSwedishCoordinate(370000, 6160000)).toBe(true);
    });

    it('should return true for valid Kiruna coordinates', () => {
      // Kiruna area: approximately 680000, 7530000
      expect(isValidSwedishCoordinate(680000, 7530000)).toBe(true);
    });

    it('should return false for coordinates west of Sweden', () => {
      expect(isValidSwedishCoordinate(100000, 6580000)).toBe(false);
    });

    it('should return false for coordinates east of Sweden', () => {
      expect(isValidSwedishCoordinate(1100000, 6580000)).toBe(false);
    });

    it('should return false for coordinates south of Sweden', () => {
      expect(isValidSwedishCoordinate(674000, 6000000)).toBe(false);
    });

    it('should return false for coordinates north of Sweden', () => {
      expect(isValidSwedishCoordinate(674000, 8000000)).toBe(false);
    });

    it('should return true for boundary coordinates', () => {
      expect(isValidSwedishCoordinate(200000, 6100000)).toBe(true);
      expect(isValidSwedishCoordinate(1000000, 7700000)).toBe(true);
    });
  });

  describe('validateBbox', () => {
    it('should not throw for valid bbox', () => {
      const bbox: BoundingBox = {
        minX: 670000,
        minY: 6570000,
        maxX: 680000,
        maxY: 6590000,
      };
      expect(() => validateBbox(bbox)).not.toThrow();
    });

    it('should throw when minX >= maxX', () => {
      const bbox: BoundingBox = {
        minX: 680000,
        minY: 6570000,
        maxX: 670000,
        maxY: 6590000,
      };
      expect(() => validateBbox(bbox)).toThrow(ValidationError);
      expect(() => validateBbox(bbox)).toThrow('minX must be less than maxX');
    });

    it('should throw when minY >= maxY', () => {
      const bbox: BoundingBox = {
        minX: 670000,
        minY: 6590000,
        maxX: 680000,
        maxY: 6570000,
      };
      expect(() => validateBbox(bbox)).toThrow(ValidationError);
      expect(() => validateBbox(bbox)).toThrow('minY must be less than maxY');
    });

    it('should throw for coordinates outside Sweden', () => {
      const bbox: BoundingBox = {
        minX: 100000,
        minY: 6570000,
        maxX: 110000,
        maxY: 6590000,
      };
      expect(() => validateBbox(bbox)).toThrow(ValidationError);
      expect(() => validateBbox(bbox)).toThrow('outside valid SWEREF99TM range');
    });
  });

  describe('validatePoint', () => {
    it('should not throw for valid point', () => {
      expect(() => validatePoint({ x: 674000, y: 6580000 })).not.toThrow();
    });

    it('should throw for point outside Sweden', () => {
      expect(() => validatePoint({ x: 100000, y: 6580000 })).toThrow(ValidationError);
      expect(() => validatePoint({ x: 100000, y: 6580000 })).toThrow('outside valid SWEREF99TM range');
    });
  });

  describe('bboxToWkt', () => {
    it('should convert bbox to WKT POLYGON', () => {
      const bbox: BoundingBox = {
        minX: 670000,
        minY: 6570000,
        maxX: 680000,
        maxY: 6590000,
      };
      const wkt = bboxToWkt(bbox);
      expect(wkt).toBe('POLYGON((670000 6570000, 680000 6570000, 680000 6590000, 670000 6590000, 670000 6570000))');
    });
  });

  describe('bboxToString', () => {
    it('should convert bbox to comma-separated string', () => {
      const bbox: BoundingBox = {
        minX: 670000,
        minY: 6570000,
        maxX: 680000,
        maxY: 6590000,
      };
      expect(bboxToString(bbox)).toBe('670000,6570000,680000,6590000');
    });
  });

  describe('corridorToBoundingBox', () => {
    it('should convert corridor to bbox with buffer', () => {
      const corridor: Corridor = {
        coordinates: [
          [670000, 6570000],
          [680000, 6580000],
        ],
        bufferMeters: 100,
      };
      const bbox = corridorToBoundingBox(corridor);
      expect(bbox.minX).toBe(669900);
      expect(bbox.minY).toBe(6569900);
      expect(bbox.maxX).toBe(680100);
      expect(bbox.maxY).toBe(6580100);
    });

    it('should throw for corridor with less than 2 points', () => {
      const corridor: Corridor = {
        coordinates: [[670000, 6570000]],
        bufferMeters: 100,
      };
      expect(() => corridorToBoundingBox(corridor)).toThrow(ValidationError);
      expect(() => corridorToBoundingBox(corridor)).toThrow('at least 2 coordinate pairs');
    });

    it('should handle multi-point corridors', () => {
      const corridor: Corridor = {
        coordinates: [
          [670000, 6570000],
          [675000, 6575000],
          [680000, 6580000],
        ],
        bufferMeters: 50,
      };
      const bbox = corridorToBoundingBox(corridor);
      expect(bbox.minX).toBe(669950);
      expect(bbox.minY).toBe(6569950);
      expect(bbox.maxX).toBe(680050);
      expect(bbox.maxY).toBe(6580050);
    });
  });

  describe('corridorToWktPolygon', () => {
    it('should convert corridor to WKT polygon', () => {
      const corridor: Corridor = {
        coordinates: [
          [670000, 6570000],
          [670000, 6580000],
        ],
        bufferMeters: 100,
      };
      const wkt = corridorToWktPolygon(corridor);
      expect(wkt).toMatch(/^POLYGON\(\(/);
      expect(wkt).toMatch(/\)\)$/);
    });

    it('should throw for corridor with less than 2 points', () => {
      const corridor: Corridor = {
        coordinates: [[670000, 6570000]],
        bufferMeters: 100,
      };
      expect(() => corridorToWktPolygon(corridor)).toThrow(ValidationError);
    });
  });

  describe('bboxDimensions', () => {
    it('should calculate width and height', () => {
      const bbox: BoundingBox = {
        minX: 670000,
        minY: 6570000,
        maxX: 680000,
        maxY: 6590000,
      };
      const dims = bboxDimensions(bbox);
      expect(dims.width).toBe(10000);
      expect(dims.height).toBe(20000);
    });
  });

  describe('bboxCenter', () => {
    it('should calculate center point', () => {
      const bbox: BoundingBox = {
        minX: 670000,
        minY: 6570000,
        maxX: 680000,
        maxY: 6590000,
      };
      const center = bboxCenter(bbox);
      expect(center.x).toBe(675000);
      expect(center.y).toBe(6580000);
    });
  });
});
