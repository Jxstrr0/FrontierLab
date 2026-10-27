// The Layers sheet (SCREENS §2, DESIGN §3.1 "Map layers"): a key to the map's
// shapes, an "All" toggle and one toggle per layer whose system exists in this
// build, each showing the actual pins it toggles (markers.ts), plus the
// Branches layer's "Available only" filter and a way into the accessible list
// view. Every change goes through the setSettings command so it saves with the game.
import { availableLayers, LEASE_ONLY_KEY, layerOn, type MapLayerId } from '../../data/mapLayers';
import * as cmd from '../../sim/commands';
import { Sheet, Toggle } from '../components';
import { act, openPanel, sheet, useGame } from '../store';
import { LayerMedallion } from './LayerIcon';
import { Crest, LandmarkSeal, LotCoin, TagMark } from './PinMarks';

/** Sizes of the legend's sample marks (px). */
const KEY_PX = { crest: 22, coin: 17, medallion: 30, seal: 32 } as const;
/** A neutral ink for sample rival crests in the legend. */
const SAMPLE_RIVAL_INK = 'var(--ledger-ink)';

export function LayersSheet() {
  const s = useGame();
  const layers = s.settings.layers;
  const list = availableLayers();
  const allOn = list.every((l) => layerOn(layers, l.id));
  const set = (patch: Record<string, boolean>) =>
    act(cmd.setSettings, { layers: { ...layers, ...patch } });
  const setAll = (on: boolean) => set(Object.fromEntries(list.map((l) => [l.id, on])));
  const close = () => (sheet.value = null);
  const brand = { ink: s.meta.brandInk, monogram: s.meta.monogram };

  return (
    <Sheet title="Map layers" onClose={close}>
      <div class="layers">
        <MapKey brand={brand} />
        <div class="layer-row">
          <span class="layer-icon-slot" aria-hidden="true" />
          <Toggle label="All" checked={allOn} onChange={setAll} />
        </div>
        {list.map((l) => (
          <LayerRow
            key={l.id}
            id={l.id}
            label={l.label}
            brand={brand}
            on={layerOn(layers, l.id)}
            onChange={(on) => set({ [l.id]: on })}
          />
        ))}
        {list.some((l) => l.id === 'branches') && (
          <div class="layer-row layer-sub">
            <span class="layer-icon-slot" aria-hidden="true" />
            <Toggle
              label="Available only"
              hint="Hide sales offices and show only open locations ($)."
              checked={layers[LEASE_ONLY_KEY] === true}
              disabled={!layerOn(layers, 'branches')}
              onChange={(on) => set({ [LEASE_ONLY_KEY]: on })}
            />
          </div>
        )}
        <button
          type="button"
          class="btn btn-secondary layers-list-btn"
          onClick={() => openPanel({ type: 'cityList' })}
        >
          List view
        </button>
      </div>
    </Sheet>
  );
}

interface Brand {
  ink: string;
  monogram: string;
}

/** How to read the map: one sample of each pin shape with what it means. */
function MapKey(p: { brand: Brand }) {
  return (
    <ul class="map-key" aria-label="How to read the map">
      <li>
        <span class="map-key-mark" aria-hidden="true">
          <Crest ink={p.brand.ink} monogram={p.brand.monogram} width={KEY_PX.crest} />
        </span>
        Labs
      </li>
      <li>
        <span class="map-key-mark" aria-hidden="true">
          <LotCoin size={KEY_PX.coin} />
        </span>
        Open spot
      </li>
      <li>
        <span class="map-key-mark" aria-hidden="true">
          <LayerMedallion id="creditBureaus" size={KEY_PX.medallion} />
        </span>
        Places
      </li>
      <li>
        <span class="map-key-mark" aria-hidden="true">
          <TagMark marker="offices" />
        </span>
        Rent or buy
      </li>
      <li>
        <span class="map-key-mark" aria-hidden="true">
          <LandmarkSeal marker="airport" size={KEY_PX.seal} />
        </span>
        Landmarks
      </li>
    </ul>
  );
}

/** The pins a layer toggles, as they appear on the map. */
function LayerPins(p: { id: MapLayerId; brand: Brand }) {
  switch (p.id) {
    case 'branches':
      return (
        <>
          <Crest ink={p.brand.ink} monogram={p.brand.monogram} width={KEY_PX.crest} />
          <Crest ink={SAMPLE_RIVAL_INK} monogram="" rival width={KEY_PX.crest} />
          <LotCoin size={KEY_PX.coin} />
        </>
      );
    case 'dataCenters':
      return <Crest ink={p.brand.ink} monogram={p.brand.monogram} width={KEY_PX.crest} />;
    case 'banks':
      return (
        <>
          <Crest ink={SAMPLE_RIVAL_INK} monogram="" rival crowned width={KEY_PX.crest} />
          <LandmarkSeal marker="centralBank" size={KEY_PX.seal} />
        </>
      );
    case 'realEstate':
      return (
        <>
          <LayerMedallion id="realEstate" size={KEY_PX.medallion} />
          <LayerMedallion id="vacationHomes" size={KEY_PX.medallion} />
        </>
      );
    case 'employers':
      // C5a: customer businesses and the anchor employers.
      return (
        <>
          <LayerMedallion id="businesses" size={KEY_PX.medallion} />
          <LayerMedallion id="employers" size={KEY_PX.medallion} />
        </>
      );
    default:
      return <LayerMedallion id={p.id} size={KEY_PX.medallion} />;
  }
}

function LayerRow(p: {
  id: MapLayerId;
  label: string;
  brand: Brand;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div class="layer-row">
      <span class="layer-icon-slot layer-pins" aria-hidden="true">
        <LayerPins id={p.id} brand={p.brand} />
      </span>
      <Toggle label={p.label} checked={p.on} onChange={p.onChange} />
    </div>
  );
}
