// Five-axis rosette for a customer business: the shared RadarRosette
// (src/app/components/RadarRosette.tsx) with the business axes — AI readiness,
// Budget, Data sensitivity, Switching cost, Financial health (businessView's
// BUSINESS_AXES). Other five-axis radars (AI models, startups) pass their own axes.
import type { Pentagon } from '../../data/types';
import { RadarRosette, type RosetteAxes } from '../components/RadarRosette';

export type { RosetteAxes };

const BUSINESS_ROSETTE_AXES: RosetteAxes = [
  ['AI readiness'],
  ['Budget'],
  ['Data', 'sensitivity'],
  ['Switching', 'cost'],
  ['Financial', 'health'],
];

export function PentagonRosette(p: {
  scores: Pentagon;
  axes?: RosetteAxes;
  /** Start of the accessible label, e.g. "Model profile". */
  label?: string;
  format?: (v: number) => string;
  /** 'compact' for the smaller rosette on Deal Desk cards. */
  size?: 'full' | 'compact';
}) {
  return (
    <RadarRosette
      scores={p.scores}
      axes={p.axes ?? BUSINESS_ROSETTE_AXES}
      label={p.label ?? 'Business profile'}
      format={p.format}
      size={p.size}
    />
  );
}
