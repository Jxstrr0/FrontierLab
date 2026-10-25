// Engraved portrait (ART_DIRECTION §4): the banknote-style plate from
// src/art/portraits.ts for any AvatarSpec, sized by width (height is 5:4).
// Used wherever a person appears: advisor bar, managers, executives, the
// founder, startup CEOs, review cards and the incident modal.
import { useId } from 'preact/hooks';
import { PORTRAIT_H, PORTRAIT_W, portraitMarkup } from '../../art/portraits';
import type { AvatarSpec } from '../../sim/state';
import './portrait.css';

/** Below this width the plate drops the guilloche and fine hatching. */
const COARSE_BELOW = 44;

export function Portrait(p: { avatar: AvatarSpec; size?: number; label?: string; class?: string }) {
  const w = p.size ?? 56;
  const h = Math.round((w * PORTRAIT_H) / PORTRAIT_W);
  const id = `pt${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const coarse = w < COARSE_BELOW;
  const html = portraitMarkup(p.avatar, coarse).replaceAll('__ID__', id);
  return (
    <svg
      class={`portrait${coarse ? ' is-coarse' : ''}${p.class ? ` ${p.class}` : ''}`}
      width={w}
      height={h}
      viewBox={`0 0 ${PORTRAIT_W} ${PORTRAIT_H}`}
      role={p.label ? 'img' : undefined}
      aria-label={p.label}
      aria-hidden={p.label ? undefined : 'true'}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
