// ============================================================================
// WMS GetFeatureInfo Response Types (raw API responses)
// ============================================================================

// Generic wrapper — all WMS GetFeatureInfo responses are GeoJSON FeatureCollections
interface WmsInfoResponse<P> {
  type: string;
  features?: Array<{ type: string; id?: string; properties: P }>;
}

export type SguBedrockInfoResponse = WmsInfoResponse<{
  bergart_tx?: string; // Rock type
  geo_enh_tx?: string; // Geological unit
  lito_n_tx?: string; // Lithology
  tekt_n_tx?: string; // Tectonic unit
  b_prop_tx?: string; // Rock properties
  alder_tx?: string; // Age/period
}>;

export type SguSoilDepthInfoResponse = WmsInfoResponse<{
  jorddjup_10x10m?: number; // Depth to bedrock in meters (10m resolution model)
}>;

export type SguGroundwaterInfoResponse = WmsInfoResponse<{
  akvifertyp?: string; // Aquifer type, e.g. "por- och sprickakvifer"
  genes?: string; // Genesis, e.g. "isälvssediment"
  infiltrationsmojligheter?: string; // Infiltration possibilities
  magasinsnamn?: string; // Aquifer name
}>;

export type SguLandslideInfoResponse = WmsInfoResponse<{
  Beskrivning?: string; // Description, e.g. "Skredärr i finkornig jordart"
  symbol?: number;
}>;

export type SguGroundwaterVulnerabilityInfoResponse = WmsInfoResponse<{
  sarbarhet?: string; // Vulnerability class
  sarbarhet_tx?: string; // Text description
}>;

export type SguRadonRiskInfoResponse = WmsInfoResponse<{
  gamma_uran?: number; // Uranium concentration in Bq/kg
}>;

export type SguWellPointInfoResponse = WmsInfoResponse<{
  Brunnsidentitet?: number;
  Kommun?: string;
  Fastighet?: string;
  Ort?: string;
  Borrdatum?: string;
  'Vattenmängd (liter/timme)'?: string;
  'Grundvattennivå (m under markyta)'?: string;
  'Totaldjup (m)'?: number;
  'Jorddjup (m)'?: string;
  Användning?: string;
}>;

export type SguSoilTypeInfoResponse = WmsInfoResponse<{
  Jordart?: string; // Soil type (e.g. "Morän", "Fyllning", "Isälvssediment")
  Kartering?: string; // Survey code
  Karttyp?: number; // Map type code
  symbol?: number; // Symbol number
}>;

// ============================================================================
// Clean Point Query Output Types
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

export interface SoilTypeInfo {
  soil_type?: string;
}

// ============================================================================
// Point Query Transform Functions
// ============================================================================

export function transformBedrockInfo(response: SguBedrockInfoResponse): BedrockInfo | null {
  const feature = response.features?.[0];
  if (!feature) return null;

  const props = feature.properties;
  return {
    rock_type: props.bergart_tx,
    geological_unit: props.geo_enh_tx,
    lithology: props.lito_n_tx,
    tectonic_unit: props.tekt_n_tx,
    rock_properties: props.b_prop_tx,
    age: props.alder_tx,
  };
}

export function transformSoilDepthInfo(response: SguSoilDepthInfoResponse): SoilDepthInfo | null {
  const feature = response.features?.[0];
  if (!feature) return null;

  const raw = feature.properties.jorddjup_10x10m;
  const depth = raw !== undefined && raw < 255 ? raw : undefined;
  return {
    depth_class: depth !== undefined ? `${depth} m` : undefined,
    depth_description: depth !== undefined ? `Estimated depth to bedrock: ${depth} meters (10m resolution model)` : undefined,
  };
}

export function transformGroundwaterInfo(response: SguGroundwaterInfoResponse): GroundwaterInfo | null {
  const feature = response.features?.[0];
  if (!feature) return null;

  const props = feature.properties;
  return {
    aquifer_type: props.akvifertyp,
    soil_layer: props.genes,
    capacity: props.infiltrationsmojligheter,
  };
}

export function transformLandslideInfo(response: SguLandslideInfoResponse): LandslideInfo | null {
  const feature = response.features?.[0];
  if (!feature) return null;

  const props = feature.properties;
  return {
    landslide_type: props.Beskrivning,
    description: props.Beskrivning,
  };
}

export function transformGroundwaterVulnerabilityInfo(
  response: SguGroundwaterVulnerabilityInfoResponse,
): GroundwaterVulnerabilityInfo | null {
  const feature = response.features?.[0];
  if (!feature) return null;

  const props = feature.properties;
  const rawClass = props.sarbarhet;

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

  const raw = feature.properties.gamma_uran;
  const value = raw !== undefined && raw < 1e10 ? raw : undefined;
  let riskLevel: string | undefined;
  if (value !== undefined) {
    if (value < 3) riskLevel = 'low';
    else if (value < 5) riskLevel = 'moderate';
    else riskLevel = 'high';
  }

  return { radiation_value: value, risk_level: riskLevel };
}

export function transformWellPointInfo(response: SguWellPointInfoResponse): WellPointInfo | null {
  const feature = response.features?.[0];
  if (!feature) return null;

  const props = feature.properties;
  return {
    well_id: props.Brunnsidentitet,
    total_depth_m: props['Totaldjup (m)'],
    soil_depth_m: props['Jorddjup (m)'] !== undefined ? Number(props['Jorddjup (m)']) : undefined,
    capacity_ls: props['Vattenmängd (liter/timme)'] !== undefined ? Number(props['Vattenmängd (liter/timme)']) / 3600 : undefined,
    groundwater_level_m: props['Grundvattennivå (m under markyta)'] !== undefined ? Number(props['Grundvattennivå (m under markyta)']) : undefined,
    usage: props.Användning,
  };
}

export function transformSoilTypeInfo(response: SguSoilTypeInfoResponse): SoilTypeInfo | null {
  const feature = response.features?.[0];
  if (!feature) return null;

  return {
    soil_type: feature.properties.Jordart,
  };
}
