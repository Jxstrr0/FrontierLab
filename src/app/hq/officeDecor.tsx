// How each HQ department furnishes its floor (ART_DIRECTION §3, "HQ floors"):
// props along the back wall, a board or frames on the left wall beside the
// door and clock, and something in the front. Finance keeps filing
// cabinets and certificates, HR a water cooler and a pinboard, Products a
// whiteboard sketch, Treasury and IT a live ticker, Marketing posters and an
// easel, Safety a caged eval rack and a chart, the Executive suite books and a painting.
import type { ComponentChildren } from 'preact';
import type { DeptId } from '../../sim/state';
import { IsoBox, type Iso } from '../components/isoKit';
import {
  Bench,
  Cabinet,
  Easel,
  Plant,
  Rack,
  SandboxRack,
  Shelf,
  WaterCooler,
} from '../components/isoProps';
import { Board, Door, Frame, WallClock } from '../components/isoWall';

type Dept = DeptId | undefined;

/** Back-wall furniture, standing between j = 0.1 and 0.6 (desks start further forward). */
export function DeptBackProps(p: { g: Iso; dept: Dept; w: number; windows: number[] }) {
  const { g, w } = p;
  const j = 0.12;
  const far = w - 1.7;
  const items: ComponentChildren[] = [];
  switch (p.dept) {
    case 'finance':
      items.push(
        <Cabinet g={g} i={1.1} j={j} />,
        <Cabinet g={g} i={1.9} j={j} />,
        <Shelf g={g} i={far - 0.9} j={j} w={1.6} />,
      );
      break;
    case 'treasury':
      items.push(<Shelf g={g} i={1.1} j={j} w={1.4} />, <Cabinet g={g} i={far} j={j} />);
      break;
    case 'hr':
      items.push(<WaterCooler g={g} i={1.2} j={j} />, <Shelf g={g} i={far - 0.9} j={j} w={1.6} />);
      break;
    case 'products':
      items.push(
        <Shelf g={g} i={1.1} j={j} w={1.8} />,
        <Bench g={g} i={far - 0.6} j={j} w={1.4} />,
      );
      break;
    case 'marketing':
      items.push(
        <Shelf g={g} i={1.1} j={j} w={1.6} />,
        <Bench g={g} i={far - 0.6} j={j} w={1.4} soft />,
      );
      break;
    case 'it':
    case 'investment':
      items.push(
        <Rack g={g} i={1.1} j={j} seed={1} />,
        <Rack g={g} i={1.8} j={j} seed={2} />,
        <Rack g={g} i={2.5} j={j} seed={3} />,
        <Rack g={g} i={far} j={j} seed={4} />,
      );
      break;
    case 'risk':
      items.push(
        <SandboxRack g={g} i={1.1} j={j} seed={5} />,
        <Cabinet g={g} i={1.9} j={j} />,
        <Cabinet g={g} i={far} j={j} />,
      );
      break;
    case 'executive':
      items.push(
        <Shelf g={g} i={1.1} j={j} w={2} />,
        <Bench g={g} i={far - 0.8} j={j} w={1.6} soft />,
      );
      break;
    default:
      // A new floor: the movers' boxes, waiting to be unpacked.
      items.push(
        <IsoBox g={g} i={1.4} j={0.5} w={0.6} d={0.5} h={0.45} left="light" fine />,
        <IsoBox g={g} i={1.5} j={0.55} w={0.45} d={0.4} h={0.35} z={0.45} left="light" fine />,
        <IsoBox g={g} i={2.3} j={0.7} w={0.55} d={0.5} h={0.4} left="light" fine />,
      );
  }
  return <g>{items}</g>;
}

/** Left wall: the department's board or frames, a clock, and the door near the front. */
export function DeptWallDecor(p: { g: Iso; dept: Dept; d: number }) {
  const s = p.g.step;
  const boardW = Math.max(1.2, Math.min(2.2, p.d - 2.2)) * s;
  const x = 0.4 * s;
  const y = -2.15 * s;
  const h = 1.05 * s;
  let board: ComponentChildren = null;
  switch (p.dept) {
    case 'finance':
      board = (
        <g>
          <Frame x={x} y={y} w={boardW * 0.45} h={h * 0.7} kind="text" />
          <Frame x={x + boardW * 0.55} y={y} w={boardW * 0.45} h={h * 0.7} kind="text" />
        </g>
      );
      break;
    case 'hr':
      board = <Board x={x} y={y} w={boardW} h={h} kind="notes" />;
      break;
    case 'products':
      board = <Board x={x} y={y} w={boardW} h={h} kind="sketch" />;
      break;
    case 'treasury':
    case 'it':
    case 'investment':
      board = <Board x={x} y={y} w={boardW} h={h} kind="ticker" />;
      break;
    case 'risk':
      board = <Board x={x} y={y} w={boardW} h={h} kind="chart" />;
      break;
    case 'marketing':
      board = (
        <g>
          <Frame x={x} y={y - 2} w={boardW * 0.42} h={h * 1.1} />
          <Frame x={x + boardW * 0.55} y={y + 3} w={boardW * 0.45} h={h * 0.8} />
        </g>
      );
      break;
    case 'executive':
      board = <Frame x={x} y={y - 2} w={boardW} h={h * 1.15} />;
      break;
  }
  const doorW = 0.8 * s;
  const doorX = (p.d - 1.05) * s;
  return (
    <g>
      {board}
      <WallClock x={Math.min(doorX - 0.5 * s, x + boardW + 0.55 * s)} y={-2.2 * s} />
      <Door x={doorX} w={doorW} h={2 * s} open={p.dept !== undefined} />
    </g>
  );
}

/** The front corner: an easel for Marketing, otherwise a palm by the door. */
export function DeptFrontProp(p: { g: Iso; dept: Dept; w: number; d: number }) {
  if (p.dept === 'marketing') return <Easel g={p.g} i={p.w - 0.45} j={p.d - 0.55} />;
  if (!p.dept) return null;
  return <Plant g={p.g} i={0.45} j={p.d - 0.4} tall />;
}
