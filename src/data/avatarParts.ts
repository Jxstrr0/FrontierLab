// Founder avatar parts (ART_DIRECTION §4): how many options each part has, the
// names the avatar picker shows, and which group of the picker each sits in.
// Indices match AvatarSpec in sim/state.ts.
export type AvatarPart =
  'head' | 'eyes' | 'brows' | 'mouth' | 'age' | 'tone' | 'hair' | 'facial' | 'glasses' | 'attire';

export type AvatarGroup = 'face' | 'style';

export interface AvatarPartSpec {
  part: AvatarPart;
  label: string;
  group: AvatarGroup;
  /** One name per option; the count is the number of options. */
  names: readonly string[];
}

const numbered = (word: string, n: number) =>
  Array.from({ length: n }, (_, i) => `${word} ${i + 1}`);

export const AVATAR_GROUPS: readonly { id: AvatarGroup; label: string }[] = [
  { id: 'face', label: 'Face' },
  { id: 'style', label: 'Style' },
];

export const AVATAR_PARTS: readonly AvatarPartSpec[] = [
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
  { part: 'tone', label: 'Skin tone', group: 'face', names: numbered('Tone', 6) },
  {
    part: 'hair',
    label: 'Hair',
    group: 'style',
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
    group: 'style',
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
    names: ['Suit', 'Blouse', 'Sweater', 'Turtleneck'],
  },
];
