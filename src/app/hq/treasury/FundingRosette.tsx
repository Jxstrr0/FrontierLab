// Compact five-axis rosette for a funding lot or offer (DESIGN §5.8.4): the
// shared RadarRosette at its compact size. Axis order follows FUNDING_TYPES:
// Cost, Term, Stability, Flexibility, Discretion (1–10; higher is better for
// the bank, so cheap funding scores high on Cost).
import type { Pentagon } from '../../../data/types';
import { RadarRosette, type RosetteAxes } from '../../components/RadarRosette';

const AXES: RosetteAxes = [['Cost'], ['Term'], ['Stability'], ['Flexibility'], ['Discretion']];

export function FundingRosette(p: { radar: Pentagon }) {
  return <RadarRosette scores={p.radar} axes={AXES} size="compact" />;
}
