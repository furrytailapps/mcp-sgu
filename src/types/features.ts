import type { GeoJsonGeometry, GeoJsonFeature } from '@/types/geojson';

// ============================================================================
// Raw SGU OGC API types
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

// Collection: jordarter (OGC API Features)
export interface SguSoilProperties {
  jg2_tx: string; // Soil type text, e.g. "Moranlera"
  jg2?: string; // Soil type code
  kartering?: string; // Survey / mapping ID
  karttyp?: string; // Map type
  geom_area?: number; // Area in square meters
  geom_length?: number; // Perimeter length
}

// Collection: grundvattenmagasin (OGC API Features)
export interface SguAquiferProperties {
  akvifertyp: string; // Aquifer type, e.g. "porakvifer"
  magasinsposition?: string; // Position, e.g. "ytligt"
  genes?: string; // Genesis, e.g. "glacifluvial"
  infiltrationsmojligheter?: string; // Infiltration possibilities
  geometrikvalitet?: string; // Geometry quality
  bergart?: string; // Rock type
  geologisk_period?: string; // Geological period
  unik_magasinsidentitet?: string; // Unique aquifer identity
}

// Collection: jordlager (OGC API Features — borehole soil layers)
export interface SguSoilLayerProperties {
  lagernr: number; // Layer number
  djup_fran?: number; // Depth from (m)
  djup_till?: number; // Depth to (m)
  kornst_tx?: string; // Grain size text
  genes_tx?: string; // Genesis text, e.g. "fyllning"
  karakt_tx?: string; // Characteristic text
  lf_kod_tx?: string; // Layer type code text
  plkod_txt?: string; // Plot code text
}

// ============================================================================
// Clean output types (geometry passed through as GeoJsonGeometry)
// ============================================================================

export interface BedrockFeature {
  id: string;
  rock_type: string;
  geological_unit: string;
  lithology: string;
  tectonic_unit: string;
  rock_properties?: string;
  mineral_composition?: string;
  chemical_composition?: string;
  area_m2?: number;
  geometry?: GeoJsonGeometry;
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
  geometry?: GeoJsonGeometry;
}

export interface SoilFeature {
  id: string;
  soil_type: string;
  soil_code?: string;
  mapping_id?: string;
  area_m2?: number;
  geometry?: GeoJsonGeometry;
}

export interface AquiferFeature {
  id: string;
  aquifer_type: string;
  position?: string;
  genesis?: string;
  infiltration?: string;
  rock_type?: string;
  geological_period?: string;
  geometry?: GeoJsonGeometry;
}

export interface SoilLayerFeature {
  id: string;
  layer_number: number;
  depth_from_m?: number;
  depth_to_m?: number;
  grain_size?: string;
  genesis?: string;
  characteristics?: string;
  soil_code?: string;
  soil_classification?: string;
  geometry?: GeoJsonGeometry;
}

// ============================================================================
// Transform functions
// Geometry simplification happens later in the registry — not here.
// ============================================================================

export function transformBedrockFeature(feature: GeoJsonFeature<SguBedrockProperties>): BedrockFeature {
  const props = feature.properties;
  return {
    id: String(feature.id ?? props.objectid),
    rock_type: props.bergart_tx || 'Unknown',
    geological_unit: props.geo_enh_tx || 'Unknown',
    lithology: props.lito_n_tx || 'Unknown',
    tectonic_unit: props.tekt_n_tx || 'Unknown',
    rock_properties: props.b_prop_tx,
    mineral_composition: props.min_ss_tx,
    chemical_composition: props.kem_ss_tx,
    area_m2: props.geom_area,
    geometry: feature.geometry,
  };
}

export function transformWellFeature(feature: GeoJsonFeature<SguWellProperties>): WellFeature {
  const props = feature.properties;
  return {
    id: String(feature.id ?? props.brunnsid),
    well_id: props.brunnsid,
    municipality: props.kommunnamn,
    property: props.fastighet,
    locality: props.ort,
    drill_date: props.borrdatum !== undefined ? String(props.borrdatum) : undefined,
    total_depth_m: props.totaldjup,
    soil_depth_m: props.jorddjup,
    water_capacity_ls: props.kapacitet,
    groundwater_level_m: props.grundvattenniva,
    usage: props.anvandning,
    geometry: feature.geometry,
  };
}

export function transformSoilFeature(feature: GeoJsonFeature<SguSoilProperties>): SoilFeature {
  const props = feature.properties;
  return {
    id: String(feature.id ?? ''),
    soil_type: props.jg2_tx,
    soil_code: props.jg2,
    mapping_id: props.kartering,
    area_m2: props.geom_area,
    geometry: feature.geometry,
  };
}

export function transformAquiferFeature(feature: GeoJsonFeature<SguAquiferProperties>): AquiferFeature {
  const props = feature.properties;
  return {
    id: String(feature.id ?? ''),
    aquifer_type: props.akvifertyp,
    position: props.magasinsposition,
    genesis: props.genes,
    infiltration: props.infiltrationsmojligheter,
    rock_type: props.bergart,
    geological_period: props.geologisk_period,
    geometry: feature.geometry,
  };
}

export function transformSoilLayerFeature(feature: GeoJsonFeature<SguSoilLayerProperties>): SoilLayerFeature {
  const props = feature.properties;
  return {
    id: String(feature.id ?? ''),
    layer_number: props.lagernr,
    depth_from_m: props.djup_fran,
    depth_to_m: props.djup_till,
    grain_size: props.kornst_tx,
    genesis: props.genes_tx,
    characteristics: props.karakt_tx,
    soil_code: props.lf_kod_tx,
    soil_classification: props.plkod_txt,
    geometry: feature.geometry,
  };
}
