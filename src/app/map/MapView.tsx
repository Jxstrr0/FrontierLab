// The city map screen (SCREENS §2): a full-bleed canvas under the HUD with DOM
// pins above it. This component only wires game state to the MapController:
// it builds the city map once per city and seed, and passes pins and lot
// occupants on whenever they actually change. Taps open panels or sheets.
import { useEffect, useRef, useState } from 'preact/hooks';
import { CITIES } from '../../data/cities';
import { CLUSTER_EXPAND_ZOOM } from '../../config/mapView';
import { FEATURES } from '../../config/balance';
import { RivalSheet } from '../city/RivalSheet';
import { cityLots } from '../city/lotInfo';
import { openPanel, useGame } from '../store';
import { initialCamera, mapPlaces, rememberCamera, sceneFor } from './mapScene';
import { MapController } from './mapController';
import { buildPins, occupantsKey, occupantsOf, pinsKey } from './pins';
import './map.css';

let active: MapController | null = null;
/** A key no pin set or occupant list can have: forces the next push. */
const STALE = '\u0000';

/** The live map controller, for the debug hook. */
export const activeMap = (): MapController | null => active;

const systemReducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Text size zooms #app (settings/display.ts). The map undoes it so canvas pixels,
 * pointer maths and pin sizes stay 1:1 with the screen.
 */
const counterZoom = (scale: number) => (scale === 1 ? undefined : { zoom: String(1 / scale) });

/** The microprint ring is drawn with Public Sans; repaint once web fonts have loaded. */
const fontsLoaded = () => typeof document === 'undefined' || document.fonts?.status === 'loaded';

export function MapView() {
  const s = useGame();
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const pinHost = useRef<HTMLDivElement>(null);
  const ctrl = useRef<MapController | null>(null);
  const keys = useRef({ scene: '', build: '', pins: STALE, occupants: STALE });
  const [rivalLotId, setRivalLotId] = useState<string | null>(null);
  const [fontsReady, setFontsReady] = useState(fontsLoaded);
  // Read through a ref so the controller always sees the latest settings.
  const reduced = useRef(false);
  reduced.current = s.settings.reducedMotion || systemReducedMotion();

  useEffect(() => {
    const c = new MapController({
      container: container.current!,
      canvas: canvas.current!,
      pinHost: pinHost.current!,
      reducedMotion: () => reduced.current,
      onCamera: (cam) => rememberCamera(keys.current.scene, cam),
      onPin: (pin) => {
        if (pin.kind === 'mine' && pin.branchId)
          openPanel({ type: 'branch', branchId: pin.branchId });
        else if (pin.kind === 'rival') {
          if (FEATURES.competition) openPanel({ type: 'rivalBranch', lotId: pin.id });
          else setRivalLotId(pin.id);
        } else if (pin.kind === 'rivalHq') openPanel({ type: 'rivalHq', siteId: pin.id });
        else if (pin.kind === 'centralBank' && pin.countryId)
          openPanel({ type: 'centralBank', countryId: pin.countryId });
        else if (pin.kind === 'employer') openPanel({ type: 'employer', siteId: pin.id });
        else if (pin.kind === 'university') openPanel({ type: 'university', siteId: pin.id });
        else if (pin.kind === 'hq') openPanel({ type: 'hq', officeId: pin.officeId });
        else if (pin.kind === 'office') openPanel({ type: 'office', listingId: pin.id });
        else if (pin.kind === 'bureau') openPanel({ type: 'bureau', siteId: pin.id });
        else if (pin.kind === 'agency') openPanel({ type: 'agency', siteId: pin.id });
        else if (pin.kind === 'investmentBank')
          openPanel({ type: 'investmentBank', siteId: pin.id });
        else openPanel({ type: 'storefront', lotId: pin.id });
      },
      onCluster: (cl) =>
        c.flyTo({ x: cl.x, y: cl.y }, Math.max(CLUSTER_EXPAND_ZOOM, c.camera.zoom)),
    });
    ctrl.current = c;
    active = c;
    keys.current = { scene: '', build: '', pins: STALE, occupants: STALE };
    if (!fontsLoaded()) void document.fonts.ready.then(() => setFontsReady(true));
    return () => {
      rememberCamera(keys.current.scene, c.camera);
      c.dispose();
      if (active === c) active = null;
      ctrl.current = null;
    };
  }, []);

  // Push changes after each render; cheap string keys skip work when nothing moved.
  useEffect(() => {
    const c = ctrl.current;
    const city = CITIES[s.world.currentCityId];
    if (!c || !city) return;
    const lots = cityLots(s);
    const scene = sceneFor(city, s.meta.seed, lots, mapPlaces(s, city.id));
    // Rebuilding after the fonts load keeps the view: the camera is remembered per scene.
    const build = `${scene.key}|${fontsReady ? 'fonts' : 'fallback'}`;
    if (build !== keys.current.build) {
      if (keys.current.scene) rememberCamera(keys.current.scene, c.camera);
      keys.current = { scene: scene.key, build, pins: STALE, occupants: STALE };
      c.setScene(scene.map, scene.createRenderer(), initialCamera(s, scene));
    }
    const occupants = occupantsOf(s, lots);
    const oKey = occupantsKey(occupants);
    if (oKey !== keys.current.occupants) {
      keys.current.occupants = oKey;
      c.setOccupants(occupants);
    }
    const pins = buildPins(s, scene.map, lots);
    const pKey = pinsKey(pins);
    if (pKey !== keys.current.pins) {
      keys.current.pins = pKey;
      c.setPins(pins);
    }
  });

  return (
    <>
      <div class="map-view" ref={container} style={counterZoom(s.settings.textScale)}>
        <canvas class="map-canvas" ref={canvas} aria-hidden="true" />
        <div class="pin-layer" ref={pinHost} role="group" aria-label="Places on the map" />
      </div>
      {rivalLotId && <RivalSheet s={s} lotId={rivalLotId} onClose={() => setRivalLotId(null)} />}
    </>
  );
}
