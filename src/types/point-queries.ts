// ============================================================================
// WMS GetFeatureInfo Response Types (raw API responses)
// ============================================================================

// Generic wrapper — all WMS GetFeatureInfo responses are GeoJSON FeatureCollections
interface WmsInfoResponse<P> {
  type: string;
  features?: Array<{ type: string; id?: string; properties: P }>;
}

export type SguSoilDepthInfoResponse = WmsInfoResponse<{
  jorddjup_10x10m?: number; // Depth to bedrock in meters (10m resolution model)
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

// ============================================================================
// Clean Point Query Output Types
// ============================================================================

export interface SoilDepthInfo {
  depth_class?: string;
  depth_description?: string;
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

// ============================================================================
// Point Query Transform Functions
// ============================================================================

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
