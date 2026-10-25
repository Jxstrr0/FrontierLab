// Founder avatar parts (ART_DIRECTION §4): how many options each part has, and
// the names the avatar picker shows. Indices match AvatarSpec in sim/state.ts.
export type AvatarPart = 'head' | 'hair' | 'facial' | 'glasses' | 'attire' | 'tone';

export interface AvatarPartSpec {
  part: AvatarPart;
  label: string;
  /** One name per option; the count is the number of options. */
  names: readonly string[];
}

const numbered = (word: string, n: number) =>
  Array.from({ length: n }, (_, i) => `${word} ${i + 1}`);

export const AVATAR_PARTS: readonly AvatarPartSpec[] = [
  { part: 'head', label: 'Head shape', names: ['Oval', 'Round', 'Square', 'Narrow'] },
  {
    part: 'hair',
    label: 'Hair',
    // Order matches the portrait generator's styles (src/art/portraitParts.ts).
    names: [
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
    ],
  },
  {
    part: 'facial',
    label: 'Facial hair',
    names: ['None', 'Moustache', 'Short beard', 'Full beard'],
  },
  { part: 'glasses', label: 'Glasses', names: ['None', 'Round', 'Square'] },
  { part: 'attire', label: 'Attire', names: ['Suit', 'Blouse', 'Sweater', 'Turtleneck'] },
  { part: 'tone', label: 'Skin tone', names: numbered('Tone', 6) },
];
