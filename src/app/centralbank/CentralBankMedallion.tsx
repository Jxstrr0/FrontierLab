// The central bank's own mark (ART_DIRECTION §2, Pins): a landmark seal in navy
// with a brass rim and an engraved columned dome in brass, larger than the
// round place medallions and unlike the bank crests of rival head offices.
// Used by the map pin and the panel header (the seal itself is in PinMarks).
import { LandmarkSeal } from '../map/PinMarks';

export function CentralBankMedallion(p: { size?: number }) {
  return <LandmarkSeal marker="centralBank" size={p.size ?? 30} class="cb-medallion" />;
}
