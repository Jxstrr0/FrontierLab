// Web Worker for the weekly autosave (src/app/saves/autosave.ts): compresses a
// serialized game with lz-string off the main thread, which on a big save takes
// long enough on a phone to stall the game for about a second every week.
// The result is byte-for-byte what saveToSlot would store.
import { compressToUTF16 } from 'lz-string';

self.onmessage = (e: MessageEvent<{ id: number; json: string }>) => {
  self.postMessage({ id: e.data.id, data: compressToUTF16(e.data.json) });
};
