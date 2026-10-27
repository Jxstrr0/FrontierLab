// Five-axis rosette for an underwriting model (DESIGN §5.8.3): Accuracy,
// Speed, Inclusion, Fraud shield and Fairness on the shared guilloche rosette,
// with one decimal per score.
import type { Pentagon } from '../../../data/types';
import { PentagonRosette } from '../../business/PentagonRosette';
import { MODEL_AXES, radarText } from './productSelectors';

export function ModelRosette(p: { radar: Pentagon; label?: string }) {
  return (
    <PentagonRosette
      scores={p.radar}
      axes={MODEL_AXES}
      label={p.label ?? 'Model profile'}
      format={radarText}
    />
  );
}
