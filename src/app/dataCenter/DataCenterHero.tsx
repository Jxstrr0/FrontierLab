// Data center hero with an Outside / Inside switch (SCREENS §5b, ART_DIRECTION
// §3, stage C8c): the engraved hall from the street or the GPU hall inside it.
// The choice is remembered for the session, so flicking between data centers
// keeps the view.
import { signal } from '@preact/signals';
import type { DcBuild } from '../../data/dataCenters';
import type { LogoShape } from '../../data/types';
import { DataCenterArt } from './DataCenterArt';
import { GpuHallArt } from './GpuHallArt';

const view = signal<'front' | 'inside'>('front');

export function DataCenterHero(p: {
  build: DcBuild;
  gpus: number;
  running: number;
  brandInk: string;
  monogram: string;
  logoShape?: LogoShape;
  energySite?: boolean;
  fitout?: boolean;
  ink?: string;
}) {
  const inside = view.value === 'inside';
  return (
    <div class="dc-hero">
      {inside ? (
        <GpuHallArt
          hall={p.build.hall}
          power={p.build.power}
          cooling={p.build.cooling}
          gpus={p.gpus}
          running={p.running}
          fitout={p.fitout}
          ink={p.ink}
        />
      ) : (
        <DataCenterArt
          hall={p.build.hall}
          cooling={p.build.cooling}
          brandInk={p.brandInk}
          monogram={p.monogram}
          logoShape={p.logoShape}
          energySite={p.energySite}
          fitout={p.fitout}
          ink={p.ink}
        />
      )}
      <button
        type="button"
        class="dc-hero-toggle"
        aria-pressed={inside}
        onClick={() => (view.value = inside ? 'front' : 'inside')}
      >
        {inside ? 'Outside' : 'Inside'}
      </button>
    </div>
  );
}
