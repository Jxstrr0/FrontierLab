// Founder avatar parts (ART_DIRECTION §4): how many options each part has, the
// names the avatar picker shows, which group of the picker each sits in, and
// the swatch colours for skin, hair and outfit. Indices match AvatarSpec in
// sim/state.ts.
export type AvatarPart =
  | 'look'
  | 'head'
  | 'eyes'
  | 'brows'
  | 'mouth'
  | 'age'
  | 'tone'
  | 'hair'
  | 'hairTone'
  | 'facial'
  | 'glasses'
  | 'attire'
  | 'outfit';

export type AvatarGroup = 'face' | 'hair' | 'style';

export interface AvatarPartSpec {
  part: AvatarPart;
  label: string;
  group: AvatarGroup;
  /** One name per option; the count is the number of options. */
  names: readonly string[];
  /** Colour parts show a row of swatches in these colours instead of arrows. */
  swatches?: readonly string[];
}

/** Six skin tones: muted, ink-tinted fills (light to deep). */
export const SKIN_TONES = ['#F2DEC8', '#E3C1A1', '#C99E7A', '#A57A58', '#7D5940', '#57402F'];

/** Seven hair colours, drawn as a fill under the engraving. */
export const HAIR_TONES = [
  '#2B2420',
  '#4A3427',
  '#6F4A31',
  '#86452B',
  '#B06A3B',
  '#D3B47C',
  '#CFCBC3',
];
export const HAIR_TONE_NAMES = [
  'Black',
  'Dark brown',
  'Chestnut',
  'Auburn',
  'Copper',
  'Blonde',
  'Silver',
];
/** How light each hair colour is (0 dark … 1 light): lighter hair gets sparser hatching. */
export const HAIR_TONE_LIGHT = [0, 0.1, 0.25, 0.3, 0.45, 0.75, 0.9];
export const SILVER_HAIR = 6;

/** Six outfit colours, muted so the hatching still reads over them. */
export const OUTFIT_TONES = ['#5A5D64', '#46536B', '#77434A', '#4F6450', '#B39672', '#D9D0BE'];
export const OUTFIT_TONE_NAMES = ['Charcoal', 'Navy', 'Burgundy', 'Forest', 'Camel', 'Stone'];

/** Hair styles in the generator's order (src/art/portraitHair.ts). */
export const HAIR_STYLE_NAMES = [
  'Short crop',
  'Side part',
  'Buzz cut',
  'Bald crown',
  'Curly top',
  'Afro',
  'Bob',
  'Long',
  'Bun',
  'Ponytail',
  'Wavy',
  'Locs',
  'Quiff',
  'Pixie',
  'Braids',
] as const;

export const AVATAR_GROUPS: readonly { id: AvatarGroup; label: string }[] = [
  { id: 'face', label: 'Face' },
  { id: 'hair', label: 'Hair' },
  { id: 'style', label: 'Style' },
];

export const AVATAR_PARTS: readonly AvatarPartSpec[] = [
  { part: 'look', label: 'Features', group: 'face', names: ['Strong', 'Soft'] },
  {
    part: 'head',
    label: 'Head shape',
    group: 'face',
    names: ['Oval', 'Round', 'Square', 'Narrow'],
  },
  { part: 'eyes', label: 'Eyes', group: 'face', names: ['Almond', 'Round', 'Hooded', 'Upturned'] },
  { part: 'brows', label: 'Brows', group: 'face', names: ['Soft arch', 'Straight', 'Bold'] },
  { part: 'mouth', label: 'Mouth', group: 'face', names: ['Smile', 'Composed', 'Grin'] },
  { part: 'age', label: 'Age', group: 'face', names: ['Fresh', 'Seasoned', 'Veteran'] },
  {
    part: 'tone',
    label: 'Skin tone',
    group: 'face',
    names: SKIN_TONES.map((_, i) => `Tone ${i + 1}`),
    swatches: SKIN_TONES,
  },
  { part: 'hair', label: 'Style', group: 'hair', names: HAIR_STYLE_NAMES },
  {
    part: 'hairTone',
    label: 'Hair colour',
    group: 'hair',
    names: HAIR_TONE_NAMES,
    swatches: HAIR_TONES,
  },
  {
    part: 'facial',
    label: 'Facial hair',
    group: 'hair',
    names: ['None', 'Moustache', 'Short beard', 'Full beard'],
  },
  {
    part: 'glasses',
    label: 'Glasses',
    group: 'style',
    names: ['None', 'Round', 'Square', 'Half-rim'],
  },
  {
    part: 'attire',
    label: 'Attire',
    group: 'style',
    names: ['Suit', 'Blouse', 'Sweater', 'Turtleneck', 'Hoodie', 'Blazer & tee'],
  },
  {
    part: 'outfit',
    label: 'Outfit colour',
    group: 'style',
    names: OUTFIT_TONE_NAMES,
    swatches: OUTFIT_TONES,
  },
];
