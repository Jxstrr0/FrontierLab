// Compact five-axis rosette for a GPU lot or offer (stage C4b): the shared
// RadarRosette at its compact size. Axis order follows GPU_LOT_TYPES: Cost,
// Term, Reliability, Flexibility, Latency (1–10; higher is better for you).
import type { Pentagon } from '../../../data/types';
import { RadarRosette, type RosetteAxes } from '../../components/RadarRosette';

const AXES: RosetteAxes = [['Cost'], ['Term'], ['Reliability'], ['Flexibility'], ['Latency']];

export function GpuRosette(p: { radar: Pentagon }) {
  return <RadarRosette scores={p.radar} axes={AXES} size="compact" />;
}
