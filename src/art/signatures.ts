// Each city's signature landmark (ART_DIRECTION §2.1, data/cityLooks.ts): one
// engraved one-of-a-kind building over a whole block. Local coordinates run
// 0..size across the block. The drawings live in signaturesMasts (round
// towers and lattices), signaturesHalls (great buildings), signaturesWater
// (water's-edge landmarks) and signaturesSky (skyscrapers). How tall each one
// may draw is SIGNATURE_HEIGHT_PX (config/map.ts), which drawList.ts uses so
// the art never clips at a chunk edge.
import type { Signature } from '../data/cityLooks';
import type { Engraver } from './engraver';
import {
  chateauHotel,
  domedBasilica,
  grandStation,
  steppedGables,
  twinSpires,
} from './signaturesHalls';
import {
  broadcastTower,
  latticeMast,
  latticeTower,
  needleTower,
  saucerTower,
} from './signaturesMasts';
import { decoSpire, prismTower, skyDeck, twinAntenna } from './signaturesSky';
import { observationWheel, sailCanopy, shellHall, suspensionBridge } from './signaturesWater';

type Draw = (e: Engraver, s: number, seed: number) => void;

const DRAW: Record<Exclude<Signature, 'none'>, Draw> = {
  chateauHotel,
  needleTower,
  sailCanopy,
  broadcastTower,
  domedBasilica,
  decoSpire,
  twinAntenna,
  suspensionBridge,
  saucerTower,
  observationWheel,
  latticeTower,
  steppedGables,
  grandStation,
  twinSpires,
  latticeMast,
  shellHall,
  skyDeck,
  prismTower,
};

export function drawSignature(e: Engraver, sig: Signature, s: number, seed: number): void {
  if (sig === 'none') return;
  DRAW[sig](e, s, seed);
}
