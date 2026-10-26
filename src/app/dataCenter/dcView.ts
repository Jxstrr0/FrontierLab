// Shared words and numbers for the data center screens (SCREENS §5b): one line
// per part saying what it does.
import type { DcPart } from '../../data/dataCenters';
import { count } from '../format/format';

/** What a part gives: GPUs held, GPUs it can power, or its PUE. */
export function partFact(part: DcPart | undefined): string {
  if (!part) return '';
  if (part.slot === 'hall')
    return `Holds ${count(part.gpus ?? 0)} GPUs · ${part.weeks} weeks to fit out`;
  if (part.slot === 'power') return `Runs up to ${count(part.gpus ?? 0)} GPUs`;
  return `PUE ${(part.pue ?? 1).toFixed(2)}`;
}
