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

// Collection: berggrund50k250k
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

// Collection: brunnar
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

// Layer: SE.GOV.SGU.JORD.GRUNDLAGER.25K
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

export interface SoilTypeInfo {
  surface_layer?: string;
  underlying_layer?: string;
  thin_surface_layer?: string;
  landform?: string;
  boulder_coverage?: string;
  raw_soil_type?: string;
}

export interface MapOptions {
  width?: number;
  height?: number;
  format?: 'png' | 'jpeg';
}

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

// ============================================================================
// Point Query Response Types (WMS GetFeatureInfo)
// ============================================================================

// Layer: SE.GOV.SGU.BERG.GEOLOGISK_ENHET.YTA.50K
export interface SguBedrockInfoResponse {
  type: string;
  features?: Array<{
    type: string;
    id?: string;
    properties: {
      bergart_tx?: string; // Rock type
      geo_enh_tx?: string; // Geological unit
      lito_n_tx?: string; // Lithology
      tekt_n_tx?: string; // Tectonic unit
      b_prop_tx?: string; // Rock properties
      alder_tx?: string; // Age/period
      // Alternative field names
      rock_type?: string;
      geological_unit?: string;
    };
  }>;
}

// Layer: SE.GOV.SGU.JORD.JORDDJUP.50K
export interface SguSoilDepthInfoResponse {
  type: string;
  features?: Array<{
    type: string;
    id?: string;
    properties: {
      jorddjup?: string; // Soil depth class
      Jorddjup?: string; // Capitalized variant
      jorddjup_tx?: string; // Soil depth text description
    };
  }>;
}

// Layer: SE.GOV.SGU.JORD.BLOCKIGHET.25K
export interface SguBoulderCoverageInfoResponse {
  type: string;
  features?: Array<{
    type: string;
    id?: string;
    properties: {
      blockighet?: string; // Boulder coverage class
      Blockighet?: string; // Capitalized variant
      blockighet_tx?: string; // Text description
    };
  }>;
}

// Layer: SE.GOV.SGU.HMAG.GRUNDVATTENMAGASIN_J1.V2
export interface SguGroundwaterInfoResponse {
  type: string;
  features?: Array<{
    type: string;
    id?: string;
    properties: {
      magasin_tx?: string; // Aquifer type
      jordlager?: string; // Soil layer
      kapacitet?: string; // Capacity
      Magasin?: string; // Capitalized variant
    };
  }>;
}

// Layer: SE.GOV.SGU.JORD.SKRED
export interface SguLandslideInfoResponse {
  type: string;
  features?: Array<{
    type: string;
    id?: string;
    properties: {
      skredtyp?: string; // Landslide type
      skredtyp_tx?: string; // Landslide type text
      datum?: string; // Date of landslide
      Skredtyp?: string; // Capitalized variant
    };
  }>;
}

// Layer: SE.GOV.SGU.GRUNDVATTEN.SARBARHET_3KL
export interface SguGroundwaterVulnerabilityInfoResponse {
  type: string;
  features?: Array<{
    type: string;
    id?: string;
    properties: {
      sarbarhet?: string; // Vulnerability class (1, 2, 3)
      Sarbarhet?: string; // Capitalized variant
      sarbarhet_tx?: string; // Text description
    };
  }>;
}

// Layer: Uran (legacy resource.sgu.se)
// Property names vary - some servers return GRAY_INDEX, others use different names
export interface SguRadonRiskInfoResponse {
  type: string;
  features?: Array<{
    type: string;
    id?: string;
    properties: Record<string, unknown>; // Flexible to handle varying property names
  }>;
}

// Layer: Brunnar (legacy resource.sgu.se)
// Property names vary - handle multiple casing variations
export interface SguWellPointInfoResponse {
  type: string;
  features?: Array<{
    type: string;
    id?: string;
    properties: Record<string, unknown>; // Flexible to handle varying property names
  }>;
}

// ============================================================================
// Point Query Clean Output Types
// ============================================================================

export interface BedrockInfo {
  rock_type?: string;
  geological_unit?: string;
  lithology?: string;
  tectonic_unit?: string;
  rock_properties?: string;
  age?: string;
}

export interface SoilDepthInfo {
  depth_class?: string;
  depth_description?: string;
}

export interface BoulderCoverageInfo {
  coverage_class?: string;
  description?: string;
}

export interface GroundwaterInfo {
  aquifer_type?: string;
  soil_layer?: string;
  capacity?: string;
}

export interface LandslideInfo {
  landslide_type?: string;
  date?: string;
  description?: string;
}

export interface GroundwaterVulnerabilityInfo {
  vulnerability_class?: string;
  description?: string;
}

export interface RadonRiskInfo {
  radiation_value?: number;
  risk_level?: string; // low, moderate, high based on value
}

export interface WellPointInfo {
  well_id?: number;
  total_depth_m?: number;
  soil_depth_m?: number;
  capacity_ls?: number;
  groundwater_level_m?: number;
  usage?: string;
}

// ============================================================================
// Point Query Transform Functions
// ============================================================================

export function transformBedrockInfo(response: SguBedrockInfoResponse): BedrockInfo | null {
  const feature = response.features?.[0];
  if (!feature) return null;

  const props = feature.properties;
  return {
    rock_type: props.bergart_tx || props.rock_type,
    geological_unit: props.geo_enh_tx || props.geological_unit,
    lithology: props.lito_n_tx,
    tectonic_unit: props.tekt_n_tx,
    rock_properties: props.b_prop_tx,
    age: props.alder_tx,
  };
}

export function transformSoilDepthInfo(response: SguSoilDepthInfoResponse): SoilDepthInfo | null {
  const feature = response.features?.[0];
  if (!feature) return null;

  const props = feature.properties;
  return {
    depth_class: props.jorddjup || props.Jorddjup,
    depth_description: props.jorddjup_tx,
  };
}

export function transformBoulderCoverageInfo(response: SguBoulderCoverageInfoResponse): BoulderCoverageInfo | null {
  const feature = response.features?.[0];
  if (!feature) return null;

  const props = feature.properties;
  return {
    coverage_class: props.blockighet || props.Blockighet,
    description: props.blockighet_tx,
  };
}

export function transformGroundwaterInfo(response: SguGroundwaterInfoResponse): GroundwaterInfo | null {
  const feature = response.features?.[0];
  if (!feature) return null;

  const props = feature.properties;
  return {
    aquifer_type: props.magasin_tx || props.Magasin,
    soil_layer: props.jordlager,
    capacity: props.kapacitet,
  };
}

export function transformLandslideInfo(response: SguLandslideInfoResponse): LandslideInfo | null {
  const feature = response.features?.[0];
  if (!feature) return null;

  const props = feature.properties;
  return {
    landslide_type: props.skredtyp || props.Skredtyp || props.skredtyp_tx,
    date: props.datum,
    description: props.skredtyp_tx,
  };
}

export function transformGroundwaterVulnerabilityInfo(
  response: SguGroundwaterVulnerabilityInfoResponse,
): GroundwaterVulnerabilityInfo | null {
  const feature = response.features?.[0];
  if (!feature) return null;

  const props = feature.properties;
  const rawClass = props.sarbarhet || props.Sarbarhet;

  // Map numeric class to human-readable
  const classMap: Record<string, string> = {
    '1': 'low',
    '2': 'moderate',
    '3': 'high',
  };

  return {
    vulnerability_class: rawClass ? classMap[rawClass] || rawClass : undefined,
    description: props.sarbarhet_tx,
  };
}

export function transformRadonRiskInfo(response: SguRadonRiskInfoResponse): RadonRiskInfo | null {
  const feature = response.features?.[0];
  if (!feature) return null;

  const props = feature.properties;

  // Try multiple possible property names for the radiation value
  // SGU WMS may return GRAY_INDEX, gray_index, value, or other variations
  let value: number | undefined;

  // Check common property names
  const possibleKeys = ['GRAY_INDEX', 'gray_index', 'value', 'Value', 'uranium', 'Uranium', 'uran', 'Uran'];
  for (const key of possibleKeys) {
    if (typeof props[key] === 'number') {
      value = props[key] as number;
      break;
    }
  }

  // If no known property found, try to find any numeric value
  if (value === undefined) {
    for (const [, val] of Object.entries(props)) {
      if (typeof val === 'number' && !Number.isNaN(val)) {
        value = val;
        break;
      }
    }
  }

  // Map radiation value to risk level
  // Based on typical uranium concentration thresholds for radon risk
  let riskLevel: string | undefined;
  if (value !== undefined) {
    if (value < 3) {
      riskLevel = 'low';
    } else if (value < 5) {
      riskLevel = 'moderate';
    } else {
      riskLevel = 'high';
    }
  }

  return {
    radiation_value: value,
    risk_level: riskLevel,
  };
}

export function transformWellPointInfo(response: SguWellPointInfoResponse): WellPointInfo | null {
  const feature = response.features?.[0];
  if (!feature) return null;

  const props = feature.properties;

  // Helper to get value with case variations
  const getNum = (...keys: string[]): number | undefined => {
    for (const key of keys) {
      if (typeof props[key] === 'number') return props[key] as number;
    }
    return undefined;
  };
  const getStr = (...keys: string[]): string | undefined => {
    for (const key of keys) {
      if (typeof props[key] === 'string') return props[key] as string;
    }
    return undefined;
  };

  return {
    well_id: getNum('brunnsid', 'Brunnsid', 'BRUNNSID', 'well_id', 'wellId'),
    total_depth_m: getNum('totaldjup', 'Totaldjup', 'TOTALDJUP', 'total_depth'),
    soil_depth_m: getNum('jorddjup', 'Jorddjup', 'JORDDJUP', 'soil_depth'),
    capacity_ls: getNum('kapacitet', 'Kapacitet', 'KAPACITET', 'capacity'),
    groundwater_level_m: getNum('grundvattenniva', 'Grundvattenniva', 'GRUNDVATTENNIVA', 'gw_level'),
    usage: getStr('anvandning', 'Anvandning', 'ANVANDNING', 'usage'),
  };
}
