// Branch hero with a Front / Inside switch (SCREENS §5, ART_DIRECTION §3): the
// exterior the player built or the banking hall inside it. The choice is
// remembered for the session, so flicking between branches keeps the view.
import { signal } from '@preact/signals';
import type { BuildSpec } from '../../data/equipment';
import { BranchArt } from './BranchArt';
import { BranchInterior, type BranchLive } from './BranchInterior';

const view = signal<'front' | 'inside'>('front');

export function BranchHero(p: {
  build: BuildSpec;
  brandInk: string;
  monogram: string;
  flagInk?: string;
  ink?: string;
  live?: BranchLive;
}) {
  const inside = view.value === 'inside';
  return (
    <div class="br-hero">
      {inside ? (
        <BranchInterior
          build={p.build}
          brandInk={p.brandInk}
          monogram={p.monogram}
          ink={p.ink}
          live={p.live}
        />
      ) : (
        <BranchArt
          exterior={p.build.exterior}
          brandInk={p.brandInk}
          monogram={p.monogram}
          flagInk={p.flagInk}
          fitout={p.live?.status === 'fitout'}
          ink={p.ink}
        />
      )}
      <button
        type="button"
        class="br-hero-toggle"
        aria-pressed={inside}
        onClick={() => (view.value = inside ? 'front' : 'inside')}
      >
        {inside ? 'Outside' : 'Inside'}
      </button>
    </div>
  );
}
