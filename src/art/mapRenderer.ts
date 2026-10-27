// The contract between the map view (src/app/map) and the city renderer
// (src/art/isoRenderer.ts). The view owns the canvas, gestures and pins; the
// renderer draws the engraved city for a camera. Plain data in, pixels out.
import type { CityMap } from './citygen';

/**
 * Who occupies a storefront lot (or leases an office building), for roof flags
 * and awnings. A 'business' (stage C5a) wears its AI vendor's awning: a rival
 * lab's ink or your brand ink once you win the contract.
 */
export interface LotOccupant {
  type: 'player' | 'rival' | 'business';
  /** Brand ink of the occupying lab, or of the business's vendor. */
  ink: string;
}

export interface MapStyle {
  /** City ink for all linework (ART_DIRECTION §1.1). */
  ink: string;
  /** Map paper colour. */
  paper: string;
  /** City name for the microprint border. */
  cityName: string;
}

/**
 * Camera: `x`, `y` are the world point (zoom-1 pixels) at the viewport's top-left
 * corner; `zoom` is CSS pixels per world pixel.
 */
export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface Viewport {
  /** CSS pixels. */
  width: number;
  height: number;
  devicePixelRatio: number;
}

export interface MapRenderer {
  /** Full map size in world pixels (zoom 1). */
  readonly width: number;
  readonly height: number;
  /** Updates lot occupants; only the affected parts of the map are redrawn. */
  setOccupants(occupants: Record<string, LotOccupant>): void;
  /**
   * Draws the visible map into ctx (sized width × dpr by height × dpr).
   * Returns true when some detail is still being prepared and another frame
   * should be requested.
   */
  render(ctx: CanvasRenderingContext2D, camera: Camera, view: Viewport): boolean;
  /** Frees cached canvases. */
  dispose(): void;
}

export type CreateMapRenderer = (map: CityMap, style: MapStyle) => MapRenderer;
