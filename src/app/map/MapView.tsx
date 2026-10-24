// The city map screen (SCREENS §2): a full-bleed canvas under the HUD with DOM
// pins above it. This component only wires game state to the MapController:
// it builds the city map once per city and seed, and passes pins and lot
// occupants on whenever they actually change. Taps open panels or sheets.
import { useEffect, useRef, useState } from 'preact/hooks';
import { CITIES } from '../../data/cities';
import { CLUSTER_EXPAND_ZOOM } from '../../config/mapView';
import { RivalSheet } from '../city/RivalSheet';
import { cityLots } from '../city/lotInfo';
import { openPanel, useGame } from '../store';
import { initialCamera, rememberCamera, sceneFor } from './mapScene';
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

export function MapView() {
  const s = useGame();
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const pinHost = useRef<HTMLDivElement>(null);
  const ctrl = useRef<MapController | null>(null);
  const keys = useRef({ scene: '', pins: STALE, occupants: STALE });
  const [rivalLotId, setRivalLotId] = useState<string | null>(null);
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
        else if (pin.kind === 'rival') setRivalLotId(pin.id);
        else openPanel({ type: 'storefront', lotId: pin.id });
      },
      onCluster: (cl) =>
        c.flyTo({ x: cl.x, y: cl.y }, Math.max(CLUSTER_EXPAND_ZOOM, c.camera.zoom)),
    });
    ctrl.current = c;
    active = c;
    keys.current = { scene: '', pins: STALE, occupants: STALE };
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
    const scene = sceneFor(city, s.meta.seed, lots);
    if (scene.key !== keys.current.scene) {
      if (keys.current.scene) rememberCamera(keys.current.scene, c.camera);
      keys.current = { scene: scene.key, pins: STALE, occupants: STALE };
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
