import { withErrorHandling } from '@/lib/response';

const LAYER_DESCRIPTIONS = {
  // Point query layers
  point_query: {
    bedrock: {
      name: 'Bedrock geology',
      description: 'Rock type, age, lithology, and tectonic unit at a specific point.',
      use_case: 'Foundation design, tunneling, blasting requirements',
    },
    soil_type: {
      name: 'Soil type',
      description: 'Surface and subsurface soil layers, landform classification.',
      use_case: 'Excavation planning, soil stability assessment',
    },
    boulder_coverage: {
      name: 'Boulder coverage',
      description: 'Density of boulders and blocks in the soil.',
      use_case: 'Excavation difficulty, equipment selection',
    },
    soil_depth: {
      name: 'Soil depth',
      description: 'Estimated depth from surface to bedrock.',
      use_case: 'Foundation depth planning, pile length estimation',
    },
    groundwater: {
      name: 'Groundwater',
      description: 'Aquifer type, soil layer, and water capacity.',
      use_case: 'Dewatering needs, water supply potential',
    },
    groundwater_vulnerability: {
      name: 'Groundwater vulnerability',
      description: 'Risk of groundwater contamination (low/moderate/high).',
      use_case: 'Environmental impact assessment, permitting',
    },
    landslide: {
      name: 'Landslide',
      description: 'Historical landslide events and affected areas.',
      use_case: 'Slope stability assessment, risk evaluation',
    },
    radon_risk: {
      name: 'Radon risk',
      description: 'Gamma radiation and uranium content as radon indicator.',
      use_case: 'Building ventilation requirements, health assessment',
    },
    well: {
      name: 'Well/borehole',
      description: 'Nearby well data including depth, capacity, and groundwater level.',
      use_case: 'Groundwater information, existing borehole reference',
    },
  },
  // Map layers
  map: {
    bedrock: {
      name: 'Bedrock map',
      description: 'Geological map showing rock types and formations.',
    },
    soil_types: {
      name: 'Soil types map',
      description: 'Surface soil classification across an area.',
    },
    boulder_coverage: {
      name: 'Boulder coverage map',
      description: 'Spatial distribution of boulder density.',
    },
    soil_depth: {
      name: 'Soil depth map',
      description: 'Estimated depth to bedrock across an area.',
    },
    groundwater: {
      name: 'Groundwater map',
      description: 'Aquifer locations and groundwater reservoirs.',
    },
    groundwater_vulnerability: {
      name: 'Groundwater vulnerability map',
      description: 'Contamination risk zones.',
    },
    landslide: {
      name: 'Landslide map',
      description: 'Historical landslide areas.',
    },
    radon_risk: {
      name: 'Radon risk map',
      description: 'Gamma radiation levels indicating radon potential.',
    },
    wells: {
      name: 'Wells map',
      description: 'Registered wells and boreholes.',
    },
    gravel_deposits: {
      name: 'Gravel deposits map',
      description: 'Sand and gravel occurrences for construction materials.',
    },
    rock_deposits: {
      name: 'Rock deposits map',
      description: 'Crushed rock material sources.',
    },
  },
};

export const describeLayersTool = {
  name: 'sgu_describe_layers',
  description:
    'List all available SGU geological data layers with descriptions. ' +
    'Use this to understand what data is available before querying.',
  inputSchema: {},
};

export const describeLayersHandler = withErrorHandling(async () => {
  return {
    coordinate_system: 'EPSG:3006 (SWEREF99TM)',
    tools: {
      sgu_query_point: {
        description: 'Query data at a specific point (x, y coordinates)',
        data_types: LAYER_DESCRIPTIONS.point_query,
      },
      sgu_get_map: {
        description: 'Generate map image for an area (bbox or corridor)',
        layers: LAYER_DESCRIPTIONS.map,
      },
      sgu_get_bedrock: {
        description: 'Get bedrock feature data (GeoJSON) for an area',
      },
    },
  };
});
