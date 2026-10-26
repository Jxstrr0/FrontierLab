// Builds the DOM for one map pin or one far-zoom cluster (ART_DIRECTION §2;
// shapes in markers.ts, marks in PinMarks.tsx). Each is a real <button> with
// its accessible label; the mark sits in `.pin-body`, which also holds the
// badges (loan applications, incidents, partner seal, conversion ring) so they
// follow the mark's size and shape. Notes and captions stack under the mark in
// `.pin-under`. Called only when the pin set changes (PinLayer), never per frame.
import { render, type VNode } from 'preact';
import { CLUSTER_MARK_PX, CLUSTER_STACK_MAX, PIN_MEDALLION_PX } from '../../config/mapView';
import { LayerMedallion } from './LayerIcon';
import {
  captionOf,
  clusterGroup,
  MARKERS,
  markerOf,
  ownedGlyph,
  pinShape,
  type MarkerId,
} from './markers';
import { Crest, LandmarkSeal, LotCoin, TagMark } from './PinMarks';
import type { Cluster } from './cluster';
import type { PinKind, PinSpec } from './pins';

const isRivalKind = (k: PinKind) => k === 'rival' || k === 'rivalHq';
const isCrowned = (k: PinKind) => k === 'hq' || k === 'rivalHq';

/** The words inside a price tag: For lease or For sale (yours are crests, not tags). */
function tagText(p: PinSpec): string {
  if (p.kind === 'office') return 'For lease';
  return p.tag ?? '';
}

function markFor(p: PinSpec): VNode {
  const shape = pinShape(p);
  const marker = markerOf(p.kind);
  if (shape === 'crest')
    return (
      <Crest
        ink={p.ink}
        monogram={p.monogram}
        rival={isRivalKind(p.kind)}
        crowned={isCrowned(p.kind)}
        icon={p.owned ? ownedGlyph(p.kind) : undefined}
      />
    );
  if (shape === 'coin' || !marker) return <LotCoin />;
  if (shape === 'landmark') return <LandmarkSeal marker={marker} />;
  if (shape === 'tag') return <TagMark marker={marker} text={tagText(p)} />;
  return <LayerMedallion id={marker} size={PIN_MEDALLION_PX} />;
}

function span(cls: string, text?: string): HTMLSpanElement {
  const el = document.createElement('span');
  el.className = cls;
  el.setAttribute('aria-hidden', 'true');
  if (text !== undefined) el.textContent = text;
  return el;
}

export function makePinElement(p: PinSpec): HTMLButtonElement {
  const shape = pinShape(p);
  const el = document.createElement('button');
  el.type = 'button';
  el.className = `map-pin pin-${p.kind} shape-${shape}${p.muted ? ' is-muted' : ''}`;
  el.dataset.lotId = p.id;
  // The tutorial's brass ring finds pins by these (SCREENS §27): storefronts,
  // your branches, and pin-{kind} for everything else (pin-office, pin-airport…).
  el.dataset.tutorial =
    p.kind === 'lot' ? 'open-lot' : p.kind === 'mine' ? 'my-branch' : `pin-${p.kind}`;
  el.setAttribute('aria-label', p.label);
  el.style.display = 'none';
  // Captions are printed in the place type's ink; rivals' and light inks' in plain ink.
  const marker = markerOf(p.kind);
  if (marker && !p.owned && !MARKERS[marker].glyph)
    el.style.setProperty('--cap-ink', MARKERS[marker].ink);

  const body = span('pin-body');
  render(markFor(p), body);
  if (p.converting) {
    // Acquired branch converting to your brand: a brass progress ring around the crest.
    el.classList.add('is-converting');
    body.insertAdjacentHTML('afterbegin', convertingRing(p.converting.progress));
  }
  if (p.partner) {
    // Your partner, club or property: a small brand-ink seal with an ivory tick.
    const seal = span('pin-partner');
    seal.style.setProperty('--pin-ink', p.ink);
    seal.innerHTML = PARTNER_SEAL_SVG;
    body.appendChild(seal);
  }
  if (p.badge) body.appendChild(span('pin-badge'));
  if (p.alert) body.appendChild(span('pin-alert'));
  el.appendChild(body);

  // Under the mark: the conversion label or a Stage 7–9 note, then the caption (close zoom).
  const under = span('pin-under');
  if (p.converting) under.appendChild(span('pin-note', 'Converting'));
  else if (p.tag && shape !== 'tag') under.appendChild(span('pin-note', p.tag));
  const caption = captionOf(p);
  if (caption) under.appendChild(span('pin-caption', caption));
  if (under.childElementCount) el.appendChild(under);
  return el;
}

/** A ring around the mark filled clockwise from the top by conversion progress (0–1). */
function convertingRing(progress: number): string {
  const size = PIN_MEDALLION_PX + 12;
  const r = size / 2 - 1.5;
  const c = 2 * Math.PI * r;
  const half = size / 2;
  return (
    `<svg class="pin-ring" aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    `<circle cx="${half}" cy="${half}" r="${r}" fill="none" stroke="var(--vault-deep)" stroke-width="3"/>` +
    `<circle cx="${half}" cy="${half}" r="${r}" fill="none" stroke="var(--brass-light)" stroke-width="3" ` +
    `stroke-dasharray="${(c * progress).toFixed(2)} ${c.toFixed(2)}" transform="rotate(-90 ${half} ${half})"/>` +
    '</svg>'
  );
}

const PARTNER_SEAL_SVG =
  '<svg viewBox="0 0 14 14" width="14" height="14"><path d="M3.8 7.2l2.1 2.1 4.3-4.6" ' +
  'fill="none" stroke="var(--ivory)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/** Members' distinct values in order, up to the stack limit. */
function distinct<T>(items: T[], key: (t: T) => string, max = CLUSTER_STACK_MAX): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const t of items) {
    const k = key(t);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
    if (out.length === max) break;
  }
  return out;
}

/** A fanned stack: the first mark in front, the others peeking out behind it. */
function Stack(p: { marks: VNode[] }) {
  return (
    <span class={`pin-stack n${p.marks.length}`}>
      {/* Painted back to front so the first mark lands on top. */}
      {p.marks
        .map((m, i) => (
          <span class={`stack-item s${i}`} key={i}>
            {m}
          </span>
        ))
        .reverse()}
    </span>
  );
}

function clusterMark(group: string, members: PinSpec[]): VNode {
  if (group === 'lot') {
    return (
      <span class="lot-cluster">
        <LotCoin size={CLUSTER_MARK_PX.coin} />
        <span class="lot-cluster-n">×{members.length}</span>
      </span>
    );
  }
  if (group === 'yours' || group === 'rival') {
    // Your places all share one ink, so lead with a branch (monogram) when there is one.
    const lead = members.find((m) => m.kind === 'mine') ?? members[0]!;
    const banks = distinct([lead, ...members], (m) => m.ink);
    return (
      <Stack
        marks={banks.map((m, i) => (
          <Crest
            ink={m.ink}
            monogram={i === 0 ? m.monogram : ''}
            icon={i === 0 && m.kind !== 'mine' ? ownedGlyph(m.kind) : undefined}
            rival={isRivalKind(m.kind)}
            width={CLUSTER_MARK_PX.crest}
          />
        ))}
      />
    );
  }
  const kinds = distinct(
    members.filter((m) => markerOf(m.kind)),
    (m) => markerOf(m.kind)!,
  ).map((m) => markerOf(m.kind)!);
  if (group === 'tag')
    return (
      <Stack
        marks={kinds.map((id: MarkerId) => (
          <TagMark marker={id} />
        ))}
      />
    );
  return (
    <Stack
      marks={kinds.map((id: MarkerId) => (
        <LayerMedallion id={id} size={CLUSTER_MARK_PX.medallion} />
      ))}
    />
  );
}

/** "3 rival branches: Harbourline, Fizz. Zoom in" and the like. */
export function clusterLabel(group: string, members: PinSpec[]): string {
  const n = members.length;
  const names = distinct(members, captionOf, Infinity).map(captionOf).filter(Boolean).join(', ');
  let what: string;
  if (group === 'lot') what = `${n} open branch locations`;
  else if (group === 'yours') {
    const hq = members.some((m) => m.kind === 'hq');
    const branches = members.filter((m) => m.kind === 'mine' && !m.dataCenterId).length;
    const places = members.filter(
      (m) => (m.kind !== 'mine' && m.kind !== 'hq') || m.dataCenterId,
    ).length;
    const parts = [
      branches ? `${branches} branch${branches === 1 ? '' : 'es'}` : '',
      hq ? 'HQ' : '',
      places ? `${places} other place${places === 1 ? '' : 's'}` : '',
    ].filter(Boolean);
    what = `Your ${parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0]}`;
  } else if (group === 'rival') what = `${n} rival lab buildings: ${names}`;
  else what = `${n} places: ${names}`;
  const waiting = members.some((m) => m.badge) ? ', loan applications waiting' : '';
  const alert = members.some((m) => m.alert) ? ', open incident' : '';
  return `${what}${waiting}${alert}. Zoom in`;
}

export function makeClusterElement(c: Cluster<PinSpec>): HTMLButtonElement {
  const group = clusterGroup(c.members[0]!);
  const el = document.createElement('button');
  el.type = 'button';
  el.className = `map-pin pin-cluster cluster-${group}`;
  el.dataset.cluster = c.key;
  el.setAttribute('aria-label', clusterLabel(group, c.members));
  el.style.display = 'none';
  const body = span('pin-body');
  render(clusterMark(group, c.members), body);
  if (group !== 'lot') body.appendChild(span('pin-chip', String(c.members.length)));
  if (c.members.some((m) => m.badge)) body.appendChild(span('pin-badge'));
  if (c.members.some((m) => m.alert)) body.appendChild(span('pin-alert'));
  el.appendChild(body);
  return el;
}
