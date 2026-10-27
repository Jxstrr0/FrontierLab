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
] as const;

/** First generation number a rival's starting model carries. */
export const RIVAL_START_GENERATION = 2;
