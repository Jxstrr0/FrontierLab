// Each city's signature landmark (ART_DIRECTION §2.1, data/cityLooks.ts): one
// engraved one-of-a-kind building over a whole block. Local coordinates run
// 0..size across the block. Placeholder: a stepped tower for every signature
// until each gets its own drawing.
import type { Signature } from '../data/cityLooks';
import type { Engraver } from './engraver';
import { box, castShadow } from './solids';

export function drawSignature(e: Engraver, _sig: Signature, s: number, _seed: number): void {
  const m = s / 2;
  castShadow(e, m - 0.6, m - 0.6, m + 0.6, m + 0.6, 90);
  box(e, 0.3, 0.3, s - 0.3, s - 0.3, 0, 12);
  box(e, m - 0.6, m - 0.6, m + 0.6, m + 0.6, 12, 70, { left: 'medium', right: 'dense' });
  box(e, m - 0.3, m - 0.3, m + 0.3, m + 0.3, 70, 90);
}
