// Five-axis rosette for a loan application: the shared RadarRosette
// (src/app/components/RadarRosette.tsx) with the Loan Desk axes —
// Management, Track record, Market, Competitiveness, Financial health. Other
// five-axis radars (underwriting models, startups) pass their own axes.
import type { Pentagon } from '../../../data/types';
import { RadarRosette, type RosetteAxes } from '../../components/RadarRosette';
import './loandesk.css';

export type { RosetteAxes };

const LOAN_AXES: RosetteAxes = [
  ['Management'],
  ['Track', 'record'],
  ['Market'],
  ['Competitiveness'],
  ['Financial', 'health'],
];

export function PentagonRosette(p: {
  scores: Pentagon;
  axes?: RosetteAxes;
  /** Start of the accessible label, e.g. "Model profile". */
  label?: string;
  format?: (v: number) => string;
}) {
  return (
    <RadarRosette
      scores={p.scores}
      axes={p.axes ?? LOAN_AXES}
      label={p.label ?? 'Application profile'}
      format={p.format}
    />
  );
}
