// ============================================================================
// WMS GetFeatureInfo Response Types (raw API responses)
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

// Layer: SE.GOV.SGU.MISC.JORDDJUPSMODELL.RASTER_INTERVALL
export interface SguSoilDepthInfoResponse {
  type: string;
  features?: Array<{
    type: string;
    id?: string;
    properties: {
      jorddjup_10x10m?: number; // Depth to bedrock in meters (10m resolution model)
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
      akvifertyp?: string; // Aquifer type, e.g. "por- och sprickakvifer"
      genes?: string; // Genesis, e.g. "isälvssediment"
      infiltrationsmojligheter?: string; // Infiltration possibilities
      magasinsnamn?: string; // Aquifer name
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
      Beskrivning?: string; // Description, e.g. "Skredärr i finkornig jordart"
      symbol?: number;
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
      sarbarhet_tx?: string; // Text description
    };
  }>;
}

// Layer: SE.GOV.SGU.URAN (maps3.sgu.se fysik workspace)
export interface SguRadonRiskInfoResponse {
  type: string;
  features?: Array<{
    type: string;
    id?: string;
    properties: {
      gamma_uran?: number; // Uranium concentration in Bq/kg
    };
  }>;
}

// Layer: SE.GOV.SGU.BRUNNAR.250K (maps3.sgu.se grundvatten workspace)
export interface SguWellPointInfoResponse {
  type: string;
  features?: Array<{
    type: string;
    id?: string;
    properties: {
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
    };
  }>;
}

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

export interface SoilTypeInfo {
  surface_layer?: string;
  underlying_layer?: string;
  thin_surface_layer?: string;
  landform?: string;
  boulder_coverage?: string;
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

  const depth = feature.properties.jorddjup_10x10m;
  return {
    depth_class: depth !== undefined ? `${depth} m` : undefined,
    depth_description: depth !== undefined ? `Estimated depth to bedrock: ${depth} meters (10m resolution model)` : undefined,
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

  const value = feature.properties.gamma_uran;
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

  const props = feature.properties;
  // Handle both capitalized (new) and lowercase (legacy) property names
  const soilType = props.Jordart || props.grundlager || props.jordart_tx || props.jordart;
  return {
    surface_layer: soilType,
    underlying_layer: props.underlag,
    thin_surface_layer: props.tunt_ytlager,
    landform: props.landform,
    boulder_coverage: props.blockighet,
  };
}
