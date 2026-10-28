// The city map screen (SCREENS §2): a full-bleed canvas under the HUD with DOM
// pins above it. This component only wires game state to the MapController:
// it builds the city map once per city and seed, and passes pins and lot
// occupants on whenever they actually change. Taps open panels or sheets.
import { useEffect, useRef, useState } from 'preact/hooks';
import { CITIES } from '../../data/cities';
import type { LandmarkId } from '../../config/map';
import { BRANCH_ZOOM, CLUSTER_EXPAND_ZOOM } from '../../config/mapView';
import { FEATURES } from '../../config/balance';
import { RivalSheet } from '../city/RivalSheet';
import { cityLots } from '../city/lotInfo';
import { openPanel, useGame } from '../store';
import { initialCamera, mapPlaces, rememberCamera, sceneFor } from './mapScene';
import { MapController } from './mapController';
import { landmarkCentre } from './landmarkPins';
import { cityMood, moodKey } from './cityMood';
import { occupantsKey, occupantsOf } from './mapOccupants';
import { buildPins, pinsKey } from './pins';
import './map.css';

let active: MapController | null = null;
/** A key no pin set or occupant list can have: forces the next push. */
const STALE = '\u0000';

/** The live map controller, for the debug hook. */
export const activeMap = (): MapController | null => active;

/** Glides the map to a landmark (the airport, from the Travel sheet), at least at BRANCH_ZOOM. */
export function focusLandmark(id: LandmarkId): boolean {
  const map = active?.cityMap;
  const at = map && landmarkCentre(map, id);
  if (!active || !at) return false;
  active.flyTo(at, Math.max(BRANCH_ZOOM, active.camera.zoom));
  return true;
}

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
  const lifeCanvas = useRef<HTMLCanvasElement>(null);
  const pinHost = useRef<HTMLDivElement>(null);
  const ctrl = useRef<MapController | null>(null);
  const keys = useRef({ scene: '', build: '', pins: STALE, occupants: STALE, mood: STALE });
  const [rivalLotId, setRivalLotId] = useState<string | null>(null);
  const [fontsReady, setFontsReady] = useState(fontsLoaded);
  // Read through a ref so the controller always sees the latest settings.
  const reduced = useRef(false);
  reduced.current = s.settings.reducedMotion || systemReducedMotion();
  // City life stands still while the game is paused (ART_DIRECTION §2.3).
  const frozen = useRef(false);
  frozen.current = reduced.current || s.clock.speed === 0;

  useEffect(() => {
    const c = new MapController({
      container: container.current!,
      canvas: canvas.current!,
      lifeCanvas: lifeCanvas.current!,
      pinHost: pinHost.current!,
      reducedMotion: () => reduced.current,
      lifeFrozen: () => frozen.current,
      onCamera: (cam) => rememberCamera(keys.current.scene, cam),
      onPin: (pin) => {
        if (pin.dataCenterId) openPanel({ type: 'dataCenter', dataCenterId: pin.dataCenterId });
        else if (pin.kind === 'mine' && pin.branchId)
          openPanel({ type: 'branch', branchId: pin.branchId });
        else if (pin.kind === 'rival') {
          if (FEATURES.competition) openPanel({ type: 'rivalBranch', lotId: pin.id });
          else setRivalLotId(pin.id);
        } else if (pin.kind === 'rivalHq') openPanel({ type: 'rivalHq', siteId: pin.id });
        else if (pin.kind === 'centralBank' && pin.countryId)
          openPanel({ type: 'centralBank', countryId: pin.countryId });
        else if (pin.kind === 'employer' || pin.kind === 'energySite')
          openPanel({ type: 'employer', siteId: pin.id });
        else if (pin.kind === 'business' && pin.businessId)
          openPanel({ type: 'business', businessId: pin.businessId });
        else if (pin.kind === 'university') openPanel({ type: 'university', siteId: pin.id });
        else if (pin.kind === 'hq') openPanel({ type: 'hq', officeId: pin.officeId });
        else if (pin.kind === 'office') openPanel({ type: 'office', listingId: pin.id });
        else if (pin.kind === 'bureau') openPanel({ type: 'bureau', siteId: pin.id });
        else if (pin.kind === 'agency') openPanel({ type: 'agency', siteId: pin.id });
        else if (pin.kind === 'investmentBank')
          openPanel({ type: 'investmentBank', siteId: pin.id });
        else if (pin.kind === 'property') openPanel({ type: 'property', siteId: pin.id });
        else if (pin.kind === 'conventionCenter') openPanel({ type: 'convention', siteId: pin.id });
        else if (pin.kind === 'lobbyingFirm') openPanel({ type: 'lobbyingFirm', siteId: pin.id });
        else if (pin.kind === 'autoDealer') openPanel({ type: 'carDealer', siteId: pin.id });
        else if (pin.kind === 'auctionHouse') openPanel({ type: 'auctionHouse', siteId: pin.id });
        else if (pin.kind === 'vacationHome') openPanel({ type: 'vacationHome', siteId: pin.id });
        else if (pin.kind === 'stadium' && pin.clubId)
          openPanel({ type: 'franchise', clubId: pin.clubId });
        else if (pin.kind === 'airport') openPanel({ type: 'airport' });
        else openPanel({ type: 'storefront', lotId: pin.id });
      },
      onCluster: (cl) =>
        c.flyTo({ x: cl.x, y: cl.y }, Math.max(CLUSTER_EXPAND_ZOOM, c.camera.zoom)),
    });
    ctrl.current = c;
    active = c;
    keys.current = { scene: '', build: '', pins: STALE, occupants: STALE, mood: STALE };
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
    const build = `${scene.key}|${lots.length}|${fontsReady ? 'fonts' : 'fallback'}`;
    if (build !== keys.current.build) {
      if (keys.current.scene) rememberCamera(keys.current.scene, c.camera);
      keys.current = { scene: scene.key, build, pins: STALE, occupants: STALE, mood: STALE };
      c.setScene(scene.map, scene.createRenderer(), scene.createLife(), initialCamera(s, scene));
    }
    const mood = cityMood(s);
    const mKey = moodKey(mood);
    if (mKey !== keys.current.mood) {
      keys.current.mood = mKey;
      c.setLifeMood(mood);
    } else c.wakeLife();
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
      // Pin medallions are drawn with Preact's render(). Preact may flush this
      // effect inside MapView's next render, where a nested render() breaks its
      // hooks, so the pins go in just after the current render finishes.
      queueMicrotask(() => {
        if (ctrl.current === c) c.setPins(pins);
      });
    }
  });

  return (
    <>
      <div class="map-view" ref={container} style={counterZoom(s.settings.textScale)}>
        <canvas class="map-canvas" ref={canvas} aria-hidden="true" />
        <canvas class="map-canvas map-life" ref={lifeCanvas} aria-hidden="true" />
        <div class="pin-layer" ref={pinHost} role="group" aria-label="Places on the map" />
      </div>
      {rivalLotId && <RivalSheet s={s} lotId={rivalLotId} onClose={() => setRivalLotId(null)} />}
    </>
  );
}
