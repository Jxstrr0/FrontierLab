// The weekly autosave without the stall (Stage 10 performance pass). The game is
// serialized on the main thread (it changes every tick, so it's captured at
// once), compressed in a Web Worker, then written to the autosave slot by
// src/sim/save/storage.ts, in exactly the format saveToSlot uses. If workers
// aren't available it falls back to saving synchronously.
import { compressToUTF16 } from 'lz-string';
import { serialize } from '../../sim/save/serialize';
import type { GameState } from '../../sim/state';
import { saveToSlot, slotMeta, slotMetaFor, writeSlot, type SaveMeta } from '../saves';

interface Job {
  json: string;
  meta: SaveMeta;
  onError: (message: string) => void;
}

/** undefined: not started yet; null: unavailable, save synchronously. */
let worker: Worker | null | undefined;
let nextId = 0;
const jobs = new Map<number, Job>();

/**
 * True when the slot already holds a newer save than this job (a manual save,
 * a new game or the game-over save landed while it was compressing).
 */
export function isSuperseded(jobSavedAt: number, stored: SaveMeta | null): boolean {
  return stored !== null && stored.savedAt > jobSavedAt;
}

function finish(job: Job, data: string): void {
  if (isSuperseded(job.meta.savedAt, slotMeta('auto'))) return;
  const err = writeSlot('auto', data, job.meta);
  if (err) job.onError(err);
}

function startWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = new Worker(new URL('./autosaveWorker.ts', import.meta.url), { type: 'module' });
  } catch {
    worker = null;
    return null;
  }
  worker.onmessage = (e: MessageEvent<{ id: number; data: string }>) => {
    const job = jobs.get(e.data.id);
    jobs.delete(e.data.id);
    if (job) finish(job, e.data.data);
  };
  worker.onerror = () => {
    // Give up on the worker; save the newest waiting game the slow way.
    worker?.terminate();
    worker = null;
    const newest = [...jobs.values()].at(-1);
    jobs.clear();
    if (newest) finish(newest, compressToUTF16(newest.json));
  };
  return worker;
}

/** Saves the game to the autosave slot; `onError` hears about failures (e.g. storage full). */
export function autosave(state: GameState, onError: (message: string) => void): void {
  const w = startWorker();
  if (!w) {
    const err = saveToSlot('auto', state);
    if (err) onError(err);
    return;
  }
  const id = ++nextId;
  const job: Job = { json: serialize(state), meta: slotMetaFor('auto', state), onError };
  jobs.set(id, job);
  w.postMessage({ id, json: job.json });
}
