// Model family names for rival labs (stage C6b, CONTENT §13b). Each rival
// takes the first family not already in use, in rival id order; its models
// are "{family} {generation}". All names are original.
export const MODEL_FAMILIES = [
  'Wren',
  'Lantern',
  'Cobalt',
  'Kestrel',
  'Fathom',
  'Juniper',
  'Halyard',
  'Tessel',
  'Sable',
  'Quarry',
  'Marlin',
  'Ember',
  // Birds
  'Osprey',
  'Plover',
  'Siskin',
  'Curlew',
  'Heron',
  'Tern',
  'Linnet',
  'Gannet',
  // Winds and weather
  'Foehn',
  'Gale',
  'Sirocco',
  'Bora',
  'Chinook',
  'Squall',
  'Levant',
  'Harmattan',
  // Minerals and metals
  'Basalt',
  'Garnet',
  'Feldspar',
  'Onyx',
  'Tourmaline',
  'Beryl',
  'Obsidian',
  'Agate',
  // Stars and sky
  'Vega',
  'Altair',
  'Deneb',
  'Rigel',
  'Spica',
  'Mizar',
  'Capella',
  'Procyon',
  // Trees and plants
  'Rowan',
  'Alder',
  'Larch',
  'Hazel',
  'Tamarack',
  'Hemlock',
  'Birch',
  'Cedar',
] as const;

/** First generation number a rival's starting model carries. */
export const RIVAL_START_GENERATION = 2;
