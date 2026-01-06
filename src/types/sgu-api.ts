/**
 * Type definitions for SGU API responses and transformed data
 */

// ============================================================================
// GeoJSON types
// ============================================================================

export interface GeoJsonGeometry {
  type: 'Point' | 'LineString' | 'Polygon' | 'MultiPoint' | 'MultiLineString' | 'MultiPolygon';
  coordinates: number[] | number[][] | number[][][] | number[][][][];
}

export interface GeoJsonFeature<P = Record<string, unknown>> {
  type: 'Feature';
  id?: string | number;
  geometry: GeoJsonGeometry;
  properties: P;
}

// ============================================================================
// Raw SGU API types (as returned by the API)
// ============================================================================

/**
 * Raw bedrock feature from SGU OGC API
 * Collection: berggrund50k250k
 */
export interface SguBedrockProperties {
  objectid: number;
  geo_enh_tx: string; // Geological unit
  bergart_tx: string; // Rock type
  lito_n_tx: string; // Lithology
  tekt_n_tx: string; // Tectonic unit
  b_roll_tx?: string; // Rock role
  b_prop_tx?: string; // Rock properties
  min_ss_tx?: string; // Mineral composition
  kem_ss_tx?: string; // Chemical composition
  farg_tx?: string; // Color
  kartering?: string; // Survey
  karttyp_tx?: string; // Map type
  avslut_ar?: number; // Completion year
  rev_dat?: string; // Revision date
  rek_skala?: string; // Recommended scale
  geom_area?: number; // Area in square meters
  geom_length?: number; // Perimeter length
}

export type SguBedrockFeature = GeoJsonFeature<SguBedrockProperties>;

/**
 * Raw well feature from SGU OGC API
 * Collection: brunnar
 */
export interface SguWellProperties {
  obsplatsid?: string;
  brunnsid: number;
  n: number; // Northing
  e: number; // Easting
  posvardering_kod?: number;
  posvardering?: string;
  kommunkod?: number;
  kommunnamn?: string;
  fastighet?: string;
  ort?: string;
  borrdatum?: number;
  kapacitet?: number; // l/s
  grundvattenniva?: number; // m
  totaldjup?: number; // m
  jorddjup?: number; // m
  anvandning_kod?: string;
  anvandning?: string;
}

export type SguWellFeature = GeoJsonFeature<SguWellProperties>;

/**
 * WMS GetFeatureInfo response for soil types (jordarter)
 * Properties from SE.GOV.SGU.JORD.GRUNDLAGER.25K layer
 */
export interface SguSoilTypeInfoResponse {
  type: string;
  features?: Array<{
    type: string;
    id?: string;
    properties: {
      Jordart?: string; // Soil type (e.g., "Morän", "Isälvssediment")
      Kartering?: string; // Survey code
      Karttyp?: number; // Map type code
      symbol?: number; // Symbol number
      // Legacy field names (may appear in some responses)
      grundlager?: string;
      jordart_tx?: string;
      jordart?: string;
      underlag?: string;
      tunt_ytlager?: string;
      landform?: string;
      blockighet?: string;
    };
  }>;
}

// ============================================================================
// Transformed types (clean output for tools)
// ============================================================================

/**
 * Clean bedrock feature for tool output
 */
export interface BedrockFeature {
  id: string;
  rock_type: string;
  geological_unit: string;
  lithology: string;
  tectonic_unit: string;
  rock_properties?: string;
  area_m2?: number;
  geometry_wkt?: string;
}

/**
 * Clean well feature for tool output
 */
export interface WellFeature {
  id: string;
  well_id: number;
  municipality?: string;
  property?: string;
  locality?: string;
  drill_date?: string;
  total_depth_m?: number;
  soil_depth_m?: number;
  water_capacity_ls?: number;
  groundwater_level_m?: number;
  usage?: string;
  coordinates: {
    x: number;
    y: number;
  };
}

/**
 * Soil type information from GetFeatureInfo
 */
export interface SoilTypeInfo {
  surface_layer?: string;
  underlying_layer?: string;
  thin_surface_layer?: string;
  landform?: string;
  boulder_coverage?: string;
  raw_soil_type?: string;
}

/**
 * Map options for WMS requests
 */
export interface MapOptions {
  width?: number;
  height?: number;
  format?: 'png' | 'jpeg';
}

/**
 * Map response
 */
export interface MapResponse {
  map_url: string;
  legend_url: string;
  bbox: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  coordinate_system: string;
  layers: string[];
}

// ============================================================================
// Transform functions
// ============================================================================

/**
 * Transform raw SGU bedrock feature to clean output
 */
export function transformBedrockFeature(feature: SguBedrockFeature): BedrockFeature {
  const props = feature.properties;
  return {
    id: String(feature.id ?? props.objectid),
    rock_type: props.bergart_tx || 'Unknown',
    geological_unit: props.geo_enh_tx || 'Unknown',
    lithology: props.lito_n_tx || 'Unknown',
    tectonic_unit: props.tekt_n_tx || 'Unknown',
    rock_properties: props.b_prop_tx,
    area_m2: props.geom_area,
    geometry_wkt: geometryToWkt(feature.geometry),
  };
}

/**
 * Transform raw SGU well feature to clean output
 */
export function transformWellFeature(feature: SguWellFeature): WellFeature {
  const props = feature.properties;
  return {
    id: String(feature.id ?? props.brunnsid),
    well_id: props.brunnsid,
    municipality: props.kommunnamn,
    property: props.fastighet,
    locality: props.ort,
    drill_date: props.borrdatum ? String(props.borrdatum) : undefined,
    total_depth_m: props.totaldjup,
    soil_depth_m: props.jorddjup,
    water_capacity_ls: props.kapacitet,
    groundwater_level_m: props.grundvattenniva,
    usage: props.anvandning,
    coordinates: {
      x: props.e,
      y: props.n,
    },
  };
}

/**
 * Transform WMS GetFeatureInfo response to clean soil type info
 */
export function transformSoilTypeInfo(response: SguSoilTypeInfoResponse): SoilTypeInfo | null {
  const feature = response.features?.[0];
  if (!feature) return null;

  const props = feature.properties;
  // Handle both capitalized (new) and lowercase (legacy) property names
  const soilType = props.Jordart || props.grundlager || props.jordart_tx || props.jordart;
  return {
    surface_layer: soilType,
    underlying_layer: props.underlag,
    thin_surface_layer: props.tunt_ytlager,
    landform: props.landform,
    boulder_coverage: props.blockighet,
    raw_soil_type: soilType,
  };
}

/**
 * Convert GeoJSON geometry to WKT
 */
function geometryToWkt(geometry: GeoJsonGeometry): string {
  const { type, coordinates } = geometry;

  switch (type) {
    case 'Point':
      return `POINT(${(coordinates as number[]).join(' ')})`;

    case 'LineString':
      return `LINESTRING(${(coordinates as number[][]).map((c) => c.join(' ')).join(', ')})`;

    case 'Polygon':
      return `POLYGON(${(coordinates as number[][][])
        .map((ring) => `(${ring.map((c) => c.join(' ')).join(', ')})`)
        .join(', ')})`;

    case 'MultiPolygon':
      return `MULTIPOLYGON(${(coordinates as number[][][][])
        .map((poly) => `(${poly.map((ring) => `(${ring.map((c) => c.join(' ')).join(', ')})`).join(', ')})`)
        .join(', ')})`;

    default:
      return `${type}(...)`;
  }
}
