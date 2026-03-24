import { describe, it, expect } from 'vitest';
import type { GeoJsonFeature, GeoJsonGeometry } from '@/types/geojson';
import {
  transformBedrockFeature,
  transformWellFeature,
  transformSoilFeature,
  transformAquiferFeature,
  transformSoilLayerFeature,
  type SguBedrockProperties,
  type SguWellProperties,
  type SguSoilProperties,
  type SguAquiferProperties,
  type SguSoilLayerProperties,
} from '@/types/features';

// ─── shared geometry fixtures ───────────────────────────────────────────────

const polygonGeometry: GeoJsonGeometry = {
  type: 'Polygon',
  coordinates: [
    [
      [670000, 6570000],
      [680000, 6570000],
      [680000, 6580000],
      [670000, 6580000],
      [670000, 6570000],
    ],
  ],
};

const pointGeometry: GeoJsonGeometry = {
  type: 'Point',
  coordinates: [18.0686, 59.3293],
};

// ─── transformBedrockFeature ─────────────────────────────────────────────────

describe('transformBedrockFeature', () => {
  const rawFeature: GeoJsonFeature<SguBedrockProperties> = {
    type: 'Feature',
    id: 'berggrund50k.42',
    geometry: polygonGeometry,
    properties: {
      objectid: 42,
      geo_enh_tx: 'Svekofenniska berggrunden',
      bergart_tx: 'Granit',
      lito_n_tx: 'Sur magmatisk bergart',
      tekt_n_tx: 'Svekokarelska orogensbältet',
      b_prop_tx: 'Foliated',
      geom_area: 1234567.89,
      geom_length: 4500.0,
    },
  };

  it('maps id from feature.id', () => {
    const result = transformBedrockFeature(rawFeature);
    expect(result.id).toBe('berggrund50k.42');
  });

  it('falls back to objectid when feature.id is absent', () => {
    const noId = { ...rawFeature, id: undefined };
    const result = transformBedrockFeature(noId);
    expect(result.id).toBe('42');
  });

  it('maps rock_type from bergart_tx', () => {
    const result = transformBedrockFeature(rawFeature);
    expect(result.rock_type).toBe('Granit');
  });

  it('maps geological_unit from geo_enh_tx', () => {
    const result = transformBedrockFeature(rawFeature);
    expect(result.geological_unit).toBe('Svekofenniska berggrunden');
  });

  it('maps lithology from lito_n_tx', () => {
    const result = transformBedrockFeature(rawFeature);
    expect(result.lithology).toBe('Sur magmatisk bergart');
  });

  it('maps tectonic_unit from tekt_n_tx', () => {
    const result = transformBedrockFeature(rawFeature);
    expect(result.tectonic_unit).toBe('Svekokarelska orogensbältet');
  });

  it('maps rock_properties from b_prop_tx', () => {
    const result = transformBedrockFeature(rawFeature);
    expect(result.rock_properties).toBe('Foliated');
  });

  it('maps area_m2 from geom_area', () => {
    const result = transformBedrockFeature(rawFeature);
    expect(result.area_m2).toBe(1234567.89);
  });

  it('passes through geometry as-is', () => {
    const result = transformBedrockFeature(rawFeature);
    expect(result.geometry).toBe(polygonGeometry);
  });

  it('does NOT include geometry_wkt', () => {
    const result = transformBedrockFeature(rawFeature);
    expect(result).not.toHaveProperty('geometry_wkt');
  });

  it('omits optional fields when absent', () => {
    const minimal: GeoJsonFeature<SguBedrockProperties> = {
      type: 'Feature',
      geometry: polygonGeometry,
      properties: {
        objectid: 1,
        geo_enh_tx: 'X',
        bergart_tx: 'Y',
        lito_n_tx: 'Z',
        tekt_n_tx: 'W',
      },
    };
    const result = transformBedrockFeature(minimal);
    expect(result.rock_properties).toBeUndefined();
    expect(result.area_m2).toBeUndefined();
  });
});

// ─── transformWellFeature ────────────────────────────────────────────────────

describe('transformWellFeature', () => {
  const rawFeature: GeoJsonFeature<SguWellProperties> = {
    type: 'Feature',
    id: 'brunnar.1001',
    geometry: pointGeometry,
    properties: {
      brunnsid: 1001,
      n: 6580000,
      e: 674000,
      kommunnamn: 'Stockholm',
      fastighet: 'HAGALUND 1:1',
      ort: 'Solna',
      borrdatum: 19950615,
      totaldjup: 80.5,
      jorddjup: 12.3,
      kapacitet: 0.5,
      grundvattenniva: 5.2,
      anvandning: 'Bergvärme',
    },
  };

  it('maps id from feature.id', () => {
    const result = transformWellFeature(rawFeature);
    expect(result.id).toBe('brunnar.1001');
  });

  it('falls back to brunnsid when feature.id is absent', () => {
    const noId = { ...rawFeature, id: undefined };
    const result = transformWellFeature(noId);
    expect(result.id).toBe('1001');
  });

  it('maps well_id from brunnsid', () => {
    const result = transformWellFeature(rawFeature);
    expect(result.well_id).toBe(1001);
  });

  it('maps municipality from kommunnamn', () => {
    const result = transformWellFeature(rawFeature);
    expect(result.municipality).toBe('Stockholm');
  });

  it('maps property from fastighet', () => {
    const result = transformWellFeature(rawFeature);
    expect(result.property).toBe('HAGALUND 1:1');
  });

  it('maps locality from ort', () => {
    const result = transformWellFeature(rawFeature);
    expect(result.locality).toBe('Solna');
  });

  it('converts borrdatum number to string', () => {
    const result = transformWellFeature(rawFeature);
    expect(result.drill_date).toBe('19950615');
  });

  it('maps total_depth_m from totaldjup', () => {
    const result = transformWellFeature(rawFeature);
    expect(result.total_depth_m).toBe(80.5);
  });

  it('maps soil_depth_m from jorddjup', () => {
    const result = transformWellFeature(rawFeature);
    expect(result.soil_depth_m).toBe(12.3);
  });

  it('maps water_capacity_ls from kapacitet', () => {
    const result = transformWellFeature(rawFeature);
    expect(result.water_capacity_ls).toBe(0.5);
  });

  it('maps groundwater_level_m from grundvattenniva', () => {
    const result = transformWellFeature(rawFeature);
    expect(result.groundwater_level_m).toBe(5.2);
  });

  it('maps usage from anvandning', () => {
    const result = transformWellFeature(rawFeature);
    expect(result.usage).toBe('Bergvärme');
  });

  it('passes through geometry as-is', () => {
    const result = transformWellFeature(rawFeature);
    expect(result.geometry).toBe(pointGeometry);
  });

  it('does NOT include coordinates field', () => {
    const result = transformWellFeature(rawFeature);
    expect(result).not.toHaveProperty('coordinates');
  });

  it('omits optional fields when absent', () => {
    const minimal: GeoJsonFeature<SguWellProperties> = {
      type: 'Feature',
      geometry: pointGeometry,
      properties: {
        brunnsid: 99,
        n: 6580000,
        e: 674000,
      },
    };
    const result = transformWellFeature(minimal);
    expect(result.municipality).toBeUndefined();
    expect(result.drill_date).toBeUndefined();
    expect(result.total_depth_m).toBeUndefined();
  });
});

// ─── transformSoilFeature ────────────────────────────────────────────────────

describe('transformSoilFeature', () => {
  const rawFeature: GeoJsonFeature<SguSoilProperties> = {
    type: 'Feature',
    id: 'jord.5001',
    geometry: polygonGeometry,
    properties: {
      jg2_tx: 'Moranlera',
      jg2: 'Mo',
      kartering: 'K2',
      geom_area: 98765.4,
    },
  };

  it('maps id from feature.id', () => {
    const result = transformSoilFeature(rawFeature);
    expect(result.id).toBe('jord.5001');
  });

  it('maps soil_type from jg2_tx', () => {
    const result = transformSoilFeature(rawFeature);
    expect(result.soil_type).toBe('Moranlera');
  });

  it('maps soil_code from jg2', () => {
    const result = transformSoilFeature(rawFeature);
    expect(result.soil_code).toBe('Mo');
  });

  it('maps mapping_id from kartering', () => {
    const result = transformSoilFeature(rawFeature);
    expect(result.mapping_id).toBe('K2');
  });

  it('maps area_m2 from geom_area', () => {
    const result = transformSoilFeature(rawFeature);
    expect(result.area_m2).toBe(98765.4);
  });

  it('passes through geometry as-is', () => {
    const result = transformSoilFeature(rawFeature);
    expect(result.geometry).toBe(polygonGeometry);
  });

  it('omits optional fields when absent', () => {
    const minimal: GeoJsonFeature<SguSoilProperties> = {
      type: 'Feature',
      geometry: polygonGeometry,
      properties: {
        jg2_tx: 'Morän',
      },
    };
    const result = transformSoilFeature(minimal);
    expect(result.soil_code).toBeUndefined();
    expect(result.mapping_id).toBeUndefined();
    expect(result.area_m2).toBeUndefined();
  });
});

// ─── transformAquiferFeature ─────────────────────────────────────────────────

describe('transformAquiferFeature', () => {
  const rawFeature: GeoJsonFeature<SguAquiferProperties> = {
    type: 'Feature',
    id: 'akvifer.200',
    geometry: polygonGeometry,
    properties: {
      akvifertyp: 'porakvifer',
      magasinsposition: 'ytligt',
      genes: 'glacifluvial',
      infiltrationsmojligheter: 'goda',
      bergart: 'Sandsten',
      geologisk_period: 'Kvartär',
    },
  };

  it('maps id from feature.id', () => {
    const result = transformAquiferFeature(rawFeature);
    expect(result.id).toBe('akvifer.200');
  });

  it('maps aquifer_type from akvifertyp', () => {
    const result = transformAquiferFeature(rawFeature);
    expect(result.aquifer_type).toBe('porakvifer');
  });

  it('maps position from magasinsposition', () => {
    const result = transformAquiferFeature(rawFeature);
    expect(result.position).toBe('ytligt');
  });

  it('maps genesis from genes', () => {
    const result = transformAquiferFeature(rawFeature);
    expect(result.genesis).toBe('glacifluvial');
  });

  it('maps infiltration from infiltrationsmojligheter', () => {
    const result = transformAquiferFeature(rawFeature);
    expect(result.infiltration).toBe('goda');
  });

  it('maps rock_type from bergart', () => {
    const result = transformAquiferFeature(rawFeature);
    expect(result.rock_type).toBe('Sandsten');
  });

  it('maps geological_period from geologisk_period', () => {
    const result = transformAquiferFeature(rawFeature);
    expect(result.geological_period).toBe('Kvartär');
  });

  it('passes through geometry as-is', () => {
    const result = transformAquiferFeature(rawFeature);
    expect(result.geometry).toBe(polygonGeometry);
  });

  it('omits optional fields when absent', () => {
    const minimal: GeoJsonFeature<SguAquiferProperties> = {
      type: 'Feature',
      geometry: polygonGeometry,
      properties: {
        akvifertyp: 'sprickakvifer',
      },
    };
    const result = transformAquiferFeature(minimal);
    expect(result.position).toBeUndefined();
    expect(result.genesis).toBeUndefined();
    expect(result.rock_type).toBeUndefined();
    expect(result.geological_period).toBeUndefined();
  });
});

// ─── transformSoilLayerFeature ───────────────────────────────────────────────

describe('transformSoilLayerFeature', () => {
  const rawFeature: GeoJsonFeature<SguSoilLayerProperties> = {
    type: 'Feature',
    id: 'jordlager.3001',
    geometry: pointGeometry,
    properties: {
      lagernr: 2,
      djup_fran: 0.5,
      djup_till: 3.0,
      kornst_tx: 'Mellansand',
      genes_tx: 'fyllning',
      karakt_tx: 'lös',
      lf_kod_tx: 'Sa',
    },
  };

  it('maps id from feature.id', () => {
    const result = transformSoilLayerFeature(rawFeature);
    expect(result.id).toBe('jordlager.3001');
  });

  it('maps layer_number from lagernr', () => {
    const result = transformSoilLayerFeature(rawFeature);
    expect(result.layer_number).toBe(2);
  });

  it('maps depth_from_m from djup_fran', () => {
    const result = transformSoilLayerFeature(rawFeature);
    expect(result.depth_from_m).toBe(0.5);
  });

  it('maps depth_to_m from djup_till', () => {
    const result = transformSoilLayerFeature(rawFeature);
    expect(result.depth_to_m).toBe(3.0);
  });

  it('maps grain_size from kornst_tx', () => {
    const result = transformSoilLayerFeature(rawFeature);
    expect(result.grain_size).toBe('Mellansand');
  });

  it('maps genesis from genes_tx', () => {
    const result = transformSoilLayerFeature(rawFeature);
    expect(result.genesis).toBe('fyllning');
  });

  it('maps characteristics from karakt_tx', () => {
    const result = transformSoilLayerFeature(rawFeature);
    expect(result.characteristics).toBe('lös');
  });

  it('maps soil_code from lf_kod_tx', () => {
    const result = transformSoilLayerFeature(rawFeature);
    expect(result.soil_code).toBe('Sa');
  });

  it('passes through geometry as-is', () => {
    const result = transformSoilLayerFeature(rawFeature);
    expect(result.geometry).toBe(pointGeometry);
  });

  it('omits optional fields when absent', () => {
    const minimal: GeoJsonFeature<SguSoilLayerProperties> = {
      type: 'Feature',
      geometry: pointGeometry,
      properties: {
        lagernr: 1,
      },
    };
    const result = transformSoilLayerFeature(minimal);
    expect(result.depth_from_m).toBeUndefined();
    expect(result.depth_to_m).toBeUndefined();
    expect(result.grain_size).toBeUndefined();
    expect(result.genesis).toBeUndefined();
  });
});
